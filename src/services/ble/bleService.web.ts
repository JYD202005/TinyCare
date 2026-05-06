import { BleAdapter, BleDevice, Biometrics, SENSOR_UUIDS } from './bleTypes';
import { evaluateBiometrics } from '../notifications/MonitoringService';

export const adapter: BleAdapter = {
  startScanning: (onDeviceFound) => {
    console.warn('En Web no hay escaneo en 2do plano. Usa connectToDevice() para abrir el selector.');
  },
  stopScanning: () => {},
  connectToDevice: async (deviceId?: string) => {
    try {
      if (!navigator.bluetooth) {
        console.warn('Bluetooth de Web no está soportado en este navegador.');
        return null;
      }

      // La API web no usa deviceId para conectar en frío, abre un selector.
      const device = await navigator.bluetooth.requestDevice({
        // acceptAllDevices: true, // Descomentar si aún no programas los UUIDs en tu ESP32
        filters: [{ services: [SENSOR_UUIDS.TINYCARE_SERVICE] }]
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('No se pudo conectar al GATT server');

      const bleDevice: BleDevice = {
        id: device.id,
        name: device.name || 'Sensor Desconocido',
        connect: async () => {
          await device.gatt?.connect();
        },
        disconnect: async () => {
          device.gatt?.disconnect();
        },
        subscribe: async (onUpdate) => {
          const service = await server.getPrimaryService(SENSOR_UUIDS.TINYCARE_SERVICE);
          const characteristic = await service.getCharacteristic(SENSOR_UUIDS.BIOMETRICS_CHAR);

          await characteristic.startNotifications();
          
          characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
            const dataView = event.target.value as DataView;
            
            // Decodificamos los mismos bytes de forma nativa en Web
            const heartRate = dataView.byteLength > 0 ? dataView.getUint8(0) : 0;
            const respiratoryRate = dataView.byteLength > 1 ? dataView.getUint8(1) : 0;
            const oxygenSaturation = dataView.byteLength > 2 ? dataView.getUint8(2) : 0;
            const tempInt = dataView.byteLength > 3 ? dataView.getUint8(3) : 0;
            const tempDec = dataView.byteLength > 4 ? dataView.getUint8(4) : 0;

            const biometrics: Biometrics = {
              heartRate,
              respiratoryRate,
              oxygenSaturation,
              temperature: tempInt + (tempDec / 100)
            };

            onUpdate(biometrics);
            evaluateBiometrics(biometrics, device.id);
          });
        },
        unsubscribe: async () => {
           const service = await server.getPrimaryService(SENSOR_UUIDS.TINYCARE_SERVICE);
           const characteristic = await service.getCharacteristic(SENSOR_UUIDS.BIOMETRICS_CHAR);
           await characteristic.stopNotifications();
        }
      };

      return bleDevice;
    } catch (error) {
      console.error('Error conectando al dispositivo web:', error);
      return null;
    }
  }
};
