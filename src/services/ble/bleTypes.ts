export interface Biometrics {
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  temperature: number;
}

// UUIDs que coinciden con el firmware del ESP32 (TinyCare_Sensor)
export const SENSOR_UUIDS = {
  TINYCARE_SERVICE: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  BIOMETRICS_CHAR: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
};

export interface BleDevice {
  id: string;
  perfilId?: string;
  name: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: (onUpdate: (data: Biometrics) => void) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export interface BleAdapter {
  startScanning: (onDeviceFound: (device: BleDevice) => void) => void;
  stopScanning: () => void;
  connectToDevice: (deviceId?: string) => Promise<BleDevice | null>;
}
