import { BleManager, Device } from 'react-native-ble-plx';
import { BleAdapter, BleDevice } from './bleService';

const manager = new BleManager();

export const adapter: BleAdapter = {
  scanAndConnect: async (): Promise<BleDevice | null> => {
    return new Promise((resolve, reject) => {
      // Comenzar escaneo
      manager.startDeviceScan(null, null, async (error, scannedDevice) => {
        if (error) {
          manager.stopDeviceScan();
          reject(error);
          return;
        }

        // Aquí deberías filtrar por el nombre o ID de tu dispositivo real
        // Ejemplo: if (scannedDevice?.name === 'TinyCareSensor') {
        if (scannedDevice && scannedDevice.name) {
          manager.stopDeviceScan();
          
          try {
            const device = await scannedDevice.connect();
            await device.discoverAllServicesAndCharacteristics();
            
            const bleDevice: BleDevice = {
              id: device.id,
              name: device.name,
              connect: async () => {
                await device.connect();
              },
              disconnect: async () => {
                await device.cancelConnection();
              },
              readData: async () => {
                // Implementación real dependerá de los UUIDs de tu hardware
                console.log('Leyendo datos de sensores en Nativo');
                return {
                  fc: 120,
                  fr: 45,
                  spo2: 95,
                  temp: 36.6,
                };
              }
            };
            
            resolve(bleDevice);
          } catch (connError) {
            reject(connError);
          }
        }
      });
      
      // Timeout opcional para detener el escaneo si no se encuentra nada
      setTimeout(() => {
        manager.stopDeviceScan();
        resolve(null);
      }, 10000);
    });
  }
};
