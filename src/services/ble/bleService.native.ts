import { BleManager, Device, State, BleError } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { BleAdapter, BleDevice, Biometrics, SENSOR_UUIDS } from './bleTypes';
import { evaluateBiometrics, notifyHardwareStatus } from '../notifications/MonitoringService';
import { startForegroundMonitoring, stopForegroundMonitoring } from '../notifications/ForegroundService';

// ---------------------------------------------------------------------------
// Instancia única del manager — creada de forma lazy para evitar fallos en
// Expo Dev Build donde los módulos nativos (TurboModules) se registran de
// forma asíncrona durante el arranque.
// ---------------------------------------------------------------------------
let _manager: BleManager | null = null;

const getManager = (): BleManager | null => {
  if (_manager) return _manager;
  try {
    _manager = new BleManager();
  } catch (e) {
    console.warn('[BLE] Error al crear BleManager:', e);
  }
  return _manager;
};

// ---------------------------------------------------------------------------
// Espera a que el adaptador Bluetooth esté encendido antes de operar.
// Timeout de 10 s para no bloquear indefinidamente.
// ---------------------------------------------------------------------------
const waitForPoweredOn = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const manager = getManager();
    if (!manager) {
      resolve(false);
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        subscription.remove();
        console.warn('[BLE] Timeout esperando PoweredOn');
        resolve(false);
      }
    }, 10_000);

    const subscription = manager.onStateChange((state) => {
      if (state === State.PoweredOn && !settled) {
        settled = true;
        clearTimeout(timeout);
        subscription.remove();
        resolve(true);
      } else if (
        (state === State.PoweredOff || state === State.Unsupported) &&
        !settled
      ) {
        settled = true;
        clearTimeout(timeout);
        subscription.remove();
        console.warn('[BLE] Adaptador BLE no disponible:', state);
        resolve(false);
      }
    }, true); // true → emite el estado actual de inmediato
  });
};

// ---------------------------------------------------------------------------
// Caché de dispositivos escaneados (evita duplicados por sesión de escaneo)
// ---------------------------------------------------------------------------
const scannedDevices = new Map<string, Device>();

// ---------------------------------------------------------------------------
// Subscripciones activas de características (para limpieza)
// ---------------------------------------------------------------------------
const activeSubscriptions = new Map<string, { remove: () => void }>();

// ---------------------------------------------------------------------------
// Parseo del payload JSON enviado por el ESP32
// ---------------------------------------------------------------------------
const parseESP32Payload = (base64Value: string): Biometrics | null => {
  try {
    const buffer = Buffer.from(base64Value, 'base64');
    const text = buffer.toString('utf-8');
    const json = JSON.parse(text);

    return {
      heartRate: json.bpm ?? 0,
      respiratoryRate: json.bpm ? Math.round(json.bpm / 4) : 0,
      oxygenSaturation: json.spo2 ?? 0,
      temperature: json.temp ?? 0,
      activity: (json.activity as any) || 'Reposo',
    };
  } catch (e) {
    console.warn('[BLE] Error parseando payload del ESP32:', e);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Crea un BleDevice a partir de un Device de react-native-ble-plx
// ---------------------------------------------------------------------------
const createBleDevice = (device: Device): BleDevice => {
  return {
    id: device.id,
    name: device.name,

    connect: async () => {
      const manager = getManager();
      if (!manager) return;
      const connected = await manager.connectToDevice(device.id);
      await connected.discoverAllServicesAndCharacteristics();
      notifyHardwareStatus('connected');
      startForegroundMonitoring();
    },

    disconnect: async () => {
      const manager = getManager();
      if (!manager) return;
      // Limpiar suscripción activa antes de desconectar
      const sub = activeSubscriptions.get(device.id);
      if (sub) {
        sub.remove();
        activeSubscriptions.delete(device.id);
      }
      try {
        await manager.cancelDeviceConnection(device.id);
      } catch (_) {
        // Ignorar si ya estaba desconectado
      }
      notifyHardwareStatus('disconnected');
      stopForegroundMonitoring();
    },

    subscribe: async (onUpdate) => {
      const manager = getManager();
      if (!manager) return;

      // Limpiar suscripción previa del mismo dispositivo
      const prev = activeSubscriptions.get(device.id);
      if (prev) {
        prev.remove();
        activeSubscriptions.delete(device.id);
      }

      const subscription = manager.monitorCharacteristicForDevice(
        device.id,
        SENSOR_UUIDS.TINYCARE_SERVICE,
        SENSOR_UUIDS.BIOMETRICS_CHAR,
        (error: BleError | null, characteristic) => {
          if (error) {
            // errorCode 201 = desconexión del dispositivo
            if (error.errorCode === 201) {
              notifyHardwareStatus('disconnected');
              stopForegroundMonitoring();
              activeSubscriptions.delete(device.id);
            } else {
              console.warn('[BLE] Error en monitoreo:', error.message);
            }
            return;
          }
          if (!characteristic?.value) return;

          const data = parseESP32Payload(characteristic.value);
          if (!data) return;

          evaluateBiometrics(data, device.id);
          onUpdate(data);
        }
      );

      activeSubscriptions.set(device.id, subscription);
    },

    unsubscribe: async () => {
      const sub = activeSubscriptions.get(device.id);
      if (sub) {
        sub.remove();
        activeSubscriptions.delete(device.id);
      }
    },
  };
};

// ---------------------------------------------------------------------------
// Adaptador público
// ---------------------------------------------------------------------------
export const adapter: BleAdapter = {
  startScanning: async (onDeviceFound) => {
    const manager = getManager();
    if (!manager) {
      console.warn('[BLE] BleManager no disponible. No se puede escanear.');
      return;
    }

    // Esperar a que el adaptador esté encendido antes de escanear
    const ready = await waitForPoweredOn();
    if (!ready) {
      console.warn('[BLE] Bluetooth no está activo. No se puede iniciar escaneo.');
      return;
    }

    scannedDevices.clear();

    // Escanear todos los dispositivos (el ESP32 a veces no anuncia su UUID por
    // limitaciones de tamaño del paquete de advertising).
    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        console.error('[BLE] Error en escaneo:', error.message, 'código:', error.errorCode);
        return;
      }

      if (device && !scannedDevices.has(device.id)) {
        scannedDevices.set(device.id, device);
        onDeviceFound(createBleDevice(device));
      }
    });
  },

  stopScanning: () => {
    const manager = getManager();
    if (!manager) return;
    manager.stopDeviceScan();
  },

  connectToDevice: async (deviceId?: string) => {
    if (!deviceId) return null;

    const manager = getManager();
    if (!manager) return null;

    // Esperar a que el adaptador esté encendido
    const ready = await waitForPoweredOn();
    if (!ready) {
      console.warn('[BLE] Bluetooth no está activo. No se puede conectar.');
      return null;
    }

    try {
      // Si el dispositivo ya estaba conectado, desconectar primero para un
      // estado limpio antes de reconectar.
      const isConnected = await manager.isDeviceConnected(deviceId).catch(() => false);
      if (isConnected) {
        await manager.cancelDeviceConnection(deviceId).catch(() => {});
      }

      const connected = await manager.connectToDevice(deviceId, {
        autoConnect: false,
        requestMTU: 512,
      });
      await connected.discoverAllServicesAndCharacteristics();
      startForegroundMonitoring();
      return createBleDevice(connected);
    } catch (e: any) {
      console.error('[BLE] Error al conectar a', deviceId, '—', e?.message ?? e);
      return null;
    }
  },
};
