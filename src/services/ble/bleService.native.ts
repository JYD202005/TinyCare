import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { BleAdapter, BleDevice, Biometrics, SENSOR_UUIDS } from './bleTypes';
import { NativeModules } from 'react-native';
import { evaluateBiometrics, notifyHardwareStatus } from '../notifications/MonitoringService';
import { startForegroundMonitoring, stopForegroundMonitoring } from '../notifications/ForegroundService';

let manager: BleManager | null = null;
try {
  if (NativeModules.BleClientManager) {
    manager = new BleManager();
  } else {
    console.warn('BleClientManager native module not available. BLE will not work.');
  }
} catch (e) {
  console.warn('Error initializing BleManager', e);
}

// Caché en memoria para evitar problemas escaneando dispositivos ya encontrados
const scannedDevices = new Map<string, Device>();

/**
 * Parsea el valor recibido de la característica BLE del ESP32.
 * El ESP32 envía JSON en texto plano: {"ir":..., "red":..., "bpm":...}
 */
const parseESP32Payload = (base64Value: string): Biometrics | null => {
  try {
    const buffer = Buffer.from(base64Value, 'base64');
    const text = buffer.toString('utf-8');
    const json = JSON.parse(text);

    return {
      heartRate: json.bpm ?? 0,
      respiratoryRate: json.bpm ? Math.round(json.bpm / 4) : 0, // Estimación FR
      oxygenSaturation: json.spo2 ?? 0,    // El ESP32 actual no lo envía; se puede extender
      temperature: json.temp ?? 0,          // Idem
    };
  } catch (e) {
    console.warn('[BLE] Error parseando payload del ESP32:', e);
    return null;
  }
};

const createBleDevice = (device: Device): BleDevice => {
  return {
    id: device.id,
    name: device.name,
    connect: async () => {
      if (!manager) return;
      const connectedDevice = await manager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      notifyHardwareStatus('connected');
      startForegroundMonitoring();
    },
    disconnect: async () => {
      if (!manager) return;
      await manager.cancelDeviceConnection(device.id);
      notifyHardwareStatus('disconnected');
      stopForegroundMonitoring();
    },
    subscribe: async (onUpdate) => {
      if (!manager) return;
      manager.monitorCharacteristicForDevice(
        device.id,
        SENSOR_UUIDS.TINYCARE_SERVICE,
        SENSOR_UUIDS.BIOMETRICS_CHAR,
        (error, characteristic) => {
          if (error) {
            if (error.errorCode === 201) {
                notifyHardwareStatus('disconnected');
                stopForegroundMonitoring();
            }
            return;
          }
          if (!characteristic?.value) return;

          // El ESP32 envía JSON en texto, lo parseamos
          const data = parseESP32Payload(characteristic.value);
          if (!data) return;

          // Analizar signos vitales y disparar alertas en background/foreground
          evaluateBiometrics(data, device.id);
          onUpdate(data);
        }
      );
    },
    unsubscribe: async () => {
    }
  };
};

export const adapter: BleAdapter = {
  startScanning: (onDeviceFound) => {
    if (!manager) {
      console.warn("BleManager not initialized. Cannot scan.");
      return;
    }
    // Escanear todos los dispositivos porque a veces el ESP32 no transmite el UUID en el paquete de 'advertising' por límite de tamaño
    manager.startDeviceScan(
      null,
      null,
      (error, device) => {
        if (error) {
          console.error('Error escaneando nativo:', error);
          return;
        }
        
        if (device) {
          if (!scannedDevices.has(device.id)) {
            scannedDevices.set(device.id, device);
            // Si quieres filtrar, puedes hacerlo aquí: if(device.name?.includes('ESP32')) ...
            onDeviceFound(createBleDevice(device));
          }
        }
      }
    );
  },
  stopScanning: () => {
    if (!manager) return;
    manager.stopDeviceScan();
  },
  connectToDevice: async (deviceId?: string) => {
    if (!deviceId || !manager) return null;
    try {
      const connectedDevice = await manager.connectToDevice(deviceId);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      startForegroundMonitoring();
      return createBleDevice(connectedDevice);
    } catch (e) {
      console.error('Error conectando a dispositivo específico:', e);
      return null;
    }
  }
};
