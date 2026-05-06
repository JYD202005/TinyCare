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
            
            // El ESP32 envía JSON en texto plano: {"ir":..., "red":..., "bpm":...}
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(dataView.buffer);
            
            try {
              const json = JSON.parse(text);
              const biometrics: Biometrics = {
                heartRate: json.bpm ?? 0,
                respiratoryRate: json.bpm ? Math.round(json.bpm / 4) : 0,
                oxygenSaturation: json.spo2 ?? 0,
                temperature: json.temp ?? 0,
              };

              onUpdate(biometrics);
              evaluateBiometrics(biometrics, device.id);
            } catch (e) {
              console.warn('[BLE Web] Error parseando JSON del ESP32:', e);
            }
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
