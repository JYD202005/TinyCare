import { BleAdapter } from './bleTypes';

export const adapter: BleAdapter = {
  startScanning: (onDeviceFound) => {
    console.warn('Bluetooth no soportado en esta plataforma.');
  },
  stopScanning: () => {},
  connectToDevice: async (deviceId?: string) => {
    console.warn('Bluetooth no soportado en esta plataforma.');
    return null;
  }
};
