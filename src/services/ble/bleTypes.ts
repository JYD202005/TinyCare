export interface Biometrics {
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  temperature: number;
}

export const SENSOR_UUIDS = {
  TINYCARE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb', 
  BIOMETRICS_CHAR: '00002a37-0000-1000-8000-00805f9b34fb',
};

export interface BleDevice {
  id: string;
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
