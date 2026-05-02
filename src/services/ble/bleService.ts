export interface Biometrics {
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  temperature: number;
}

// Estos UUIDs deben coincidir con los que programes en tu ESP32/Bluefruit
export const SENSOR_UUIDS = {
  // Servicio principal que agrupa las métricas
  TINYCARE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb', 
  BIOMETRICS_CHAR: '00002a37-0000-1000-8000-00805f9b34fb',
};

export interface BleDevice {
  id: string; // La dirección MAC (Android) o UUID (iOS/Web) que identifica al sensor
  name: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  // Suscripción a los datos biométricos en tiempo real
  subscribe: (onUpdate: (data: Biometrics) => void) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export interface BleAdapter {
  // Escanear en segundo plano buscando sensores
  startScanning: (onDeviceFound: (device: BleDevice) => void) => void;
  stopScanning: () => void;
  // Conectar directamente (útil en Web o si ya guardaste el ID en base de datos)
  connectToDevice: (deviceId?: string) => Promise<BleDevice | null>;
}
