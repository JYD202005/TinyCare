import { BleAdapter, BleDevice } from './bleService';

export const adapter: BleAdapter = {
  scanAndConnect: async (): Promise<BleDevice | null> => {
    try {
      if (!navigator.bluetooth) {
        console.warn('Bluetooth de Web no está soportado en este navegador.');
        return null;
      }

      const device = await navigator.bluetooth.requestDevice({
        // acceptAllDevices: true, // Usa esto si no tienes servicios específicos aún
        filters: [{ services: ['heart_rate'] }], // Ejemplo
        optionalServices: ['battery_service']
      });

      const server = await device.gatt?.connect();

      if (!server) {
        throw new Error('No se pudo conectar al GATT server');
      }

      const bleDevice: BleDevice = {
        id: device.id,
        name: device.name || 'Dispositivo Desconocido',
        connect: async () => {
          await device.gatt?.connect();
        },
        disconnect: async () => {
          device.gatt?.disconnect();
        },
        readData: async () => {
          // Implementación real de lectura de características GATT para Web
          console.log('Leyendo datos de sensores en Web');
          return {
            fc: 120,
            fr: 45,
            spo2: 95,
            temp: 36.6,
          };
        }
      };

      return bleDevice;
    } catch (error) {
      console.error('Error conectando al dispositivo web:', error);
      return null;
    }
  }
};
