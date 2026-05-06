import { database } from '../../database';
import { Dispositivo } from '../../database/models';
import { adapter } from './bleService';
import { BleDevice } from './bleTypes';
import { evaluateBiometrics } from '../notifications/MonitoringService';

let activeConnections: Record<string, BleDevice> = {};
let simulationIntervals: Record<string, ReturnType<typeof setInterval>> = {};
let isInitialized = false;

export const initConnectionManager = () => {
  if (isInitialized) return () => {};
  isInitialized = true;

  const dispositivosCollection = database.collections.get<Dispositivo>('dispositivos');

  const subscription = dispositivosCollection.query().observe().subscribe(async (dispositivos) => {
    const activeDevices = dispositivos.filter(d => d.estado === 'activo');
    const activeIds = activeDevices.map(d => d.identificadorHardware);

    // 1. Desconectar dispositivos removidos o inactivos
    for (const id of Object.keys(activeConnections)) {
      if (!activeIds.includes(id)) {
        console.log(`[BLE] Desconectando de: ${id}`);
        await activeConnections[id].disconnect().catch(() => {});
        delete activeConnections[id];
      }
    }
    for (const id of Object.keys(simulationIntervals)) {
      if (!activeIds.includes(id)) {
        clearInterval(simulationIntervals[id]);
        delete simulationIntervals[id];
      }
    }

    // 2. Conectar a nuevos dispositivos activos
    for (const dev of activeDevices) {
      const id = dev.identificadorHardware;
      if (!activeConnections[id] && !simulationIntervals[id]) {
        console.log(`[BLE] Intentando conectar a: ${id}`);
        
        // Simulación para dispositivos de prueba (identificadores que empiezan con SIM-)
        if (id.startsWith('SIM-')) {
          startSimulation(id);
          continue;
        }

        try {
          const bleDevice = await adapter.connectToDevice(id);
          if (bleDevice) {
            activeConnections[id] = bleDevice;
            await bleDevice.subscribe((data) => {
              // El callback está aquí, pero bleService ya llama a evaluateBiometrics.
              // Solo nos suscribimos para mantener la conexión activa.
            });
            console.log(`[BLE] Conectado a: ${id}`);
          }
        } catch (e) {
          console.warn(`[BLE] Error conectando a ${id}`, e);
        }
      }
    }
  });

  return () => {
    subscription.unsubscribe();
    isInitialized = false;
  };
};

const startSimulation = (deviceId: string) => {
  console.log(`[BLE] Iniciando simulación para ${deviceId}`);
  
  // Valores iniciales seguros
  let hr = 120;
  let spo2 = 98;
  let temp = 36.5;

  const interval = setInterval(() => {
    // Variación aleatoria controlada para simular biometría real
    hr += (Math.random() * 4 - 2);
    if (hr > 150) hr = 150;
    if (hr < 110) hr = 110;

    spo2 += (Math.random() * 2 - 1);
    if (spo2 > 100) spo2 = 100;
    if (spo2 < 93) spo2 = 93; // Evitar disparar alertas críticas todo el tiempo

    temp += (Math.random() * 0.2 - 0.1);
    if (temp > 37.5) temp = 37.5;
    if (temp < 36.0) temp = 36.0;

    const data = {
      heartRate: Math.round(hr),
      respiratoryRate: Math.round(hr / 4),
      oxygenSaturation: Math.round(spo2),
      temperature: temp
    };

    // Esto dispara el evento a UI (home, stats) y guarda en DB si es necesario
    evaluateBiometrics(data, deviceId);
  }, 2000); // Actualiza cada 2 segundos

  simulationIntervals[deviceId] = interval;
};
