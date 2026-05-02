import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { BleAdapter, BleDevice, Biometrics, SENSOR_UUIDS } from './bleService';

const manager = new BleManager();
// Caché en memoria para evitar problemas escaneando dispositivos ya encontrados
const scannedDevices = new Map<string, Device>();

const createBleDevice = (device: Device): BleDevice => {
  return {
    id: device.id,
    name: device.name,
    connect: async () => {
      const connectedDevice = await manager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
    },
    disconnect: async () => {
      await manager.cancelDeviceConnection(device.id);
    },
    subscribe: async (onUpdate) => {
      manager.monitorCharacteristicForDevice(
        device.id,
        SENSOR_UUIDS.TINYCARE_SERVICE,
        SENSOR_UUIDS.BIOMETRICS_CHAR,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;

          // RN nos da el valor en Base64. Lo pasamos a Buffer para leer los bytes.
          const buffer = Buffer.from(characteristic.value, 'base64');
          
          // Estructura acordada (Ejemplo): Byte0=FC, Byte1=FR, Byte2=SpO2, Byte3=TempInt, Byte4=TempDec
          const heartRate = buffer.length > 0 ? buffer.readUInt8(0) : 0;
          const respiratoryRate = buffer.length > 1 ? buffer.readUInt8(1) : 0;
          const oxygenSaturation = buffer.length > 2 ? buffer.readUInt8(2) : 0;
          const tempInt = buffer.length > 3 ? buffer.readUInt8(3) : 0;
          const tempDec = buffer.length > 4 ? buffer.readUInt8(4) : 0;

          onUpdate({
            heartRate,
            respiratoryRate,
            oxygenSaturation,
            temperature: tempInt + (tempDec / 100)
          });
        }
      );
    },
    unsubscribe: async () => {
       // Para cancelar en ble-plx, usualmente cancelas la transacción
       // O manejas un identificador de transacción. 
       // Simplificamos asumiendo que al desconectar, se detiene la suscripción.
    }
  };
};

export const adapter: BleAdapter = {
  startScanning: (onDeviceFound) => {
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Error escaneando nativo:', error);
        return;
      }
      
      // En producción, filtra por tu prefijo, ej. 'TinyCare'
      if (device && device.name) {
        if (!scannedDevices.has(device.id)) {
          scannedDevices.set(device.id, device);
          onDeviceFound(createBleDevice(device));
        }
      }
    });
  },
  stopScanning: () => {
    manager.stopDeviceScan();
  },
  connectToDevice: async (deviceId?: string) => {
    if (!deviceId) return null;
    try {
      const connectedDevice = await manager.connectToDevice(deviceId);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      return createBleDevice(connectedDevice);
    } catch (e) {
      console.error('Error conectando a dispositivo específico:', e);
      return null;
    }
  }
};
