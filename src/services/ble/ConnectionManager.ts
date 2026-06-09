import { database } from '../../database';
import { Dispositivo } from '../../database/models';
import { adapter } from './bleService';
import { BleDevice } from './bleTypes';
import { evaluateBiometrics } from '../notifications/MonitoringService';

let activeConnections: Record<string, BleDevice> = {};
let simulationIntervals: Record<string, ReturnType<typeof setInterval>> = {};
let connectionRetries: Record<string, ReturnType<typeof setTimeout>> = {};
let isInitialized = false;

// Intervalo global para verificar conexiones caídas
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

const connectToDevice = async (id: string) => {
  if (activeConnections[id]) return; // Ya conectado

  console.log(`[BLE] Intentando conectar a: ${id}`);
  try {
    const bleDevice = await adapter.connectToDevice(id);
    if (bleDevice) {
      activeConnections[id] = bleDevice;
      
      // Limpiar reintentos previos si fue exitoso
      if (connectionRetries[id]) {
        clearTimeout(connectionRetries[id]);
        delete connectionRetries[id];
      }

      await bleDevice.subscribe((data) => {
        // Callback para mantener la conexión activa (evaluation ya se hace en bleService)
      });
      console.log(`[BLE] Conectado a: ${id}`);
    } else {
      scheduleRetry(id);
    }
  } catch (e) {
    console.warn(`[BLE] Error conectando a ${id}`, e);
    scheduleRetry(id);
  }
};

const scheduleRetry = (id: string) => {
  if (connectionRetries[id]) clearTimeout(connectionRetries[id]);
  
  // Reintentar en 15 segundos si falló
  connectionRetries[id] = setTimeout(() => {
    delete connectionRetries[id];
    connectToDevice(id);
  }, 15000);
};

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
    
    for (const id of Object.keys(connectionRetries)) {
      if (!activeIds.includes(id)) {
        clearTimeout(connectionRetries[id]);
        delete connectionRetries[id];
      }
    }

    // 2. Conectar a nuevos dispositivos activos
    for (const dev of activeDevices) {
      const id = dev.identificadorHardware;
      if (!activeConnections[id] && !simulationIntervals[id] && !connectionRetries[id]) {
        if (id.startsWith('SIM-')) {
          startSimulation(id);
          continue;
        }
        connectToDevice(id);
      }
    }
  });

  // Health check: cada 30s intenta reconectar los dispositivos que no estén en activeConnections
  if (!healthCheckInterval) {
    healthCheckInterval = setInterval(async () => {
      const dispositivos = await dispositivosCollection.query().fetch();
      const activeDevices = dispositivos.filter(d => d.estado === 'activo');
      for (const dev of activeDevices) {
        const id = dev.identificadorHardware;
        if (!id.startsWith('SIM-') && !activeConnections[id] && !connectionRetries[id]) {
          console.log(`[BLE] Health Check: intentando reconectar a ${id}`);
          connectToDevice(id);
        }
      }
    }, 30000);
  }

  return () => {
    subscription.unsubscribe();
    isInitialized = false;
    
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
    
    for (const id of Object.keys(connectionRetries)) {
      clearTimeout(connectionRetries[id]);
    }
    connectionRetries = {};
  };
};

const startSimulation = (deviceId: string) => {
  console.log(`[BLE] Iniciando simulación para ${deviceId}`);
  
  let hr = 120;
  let spo2 = 98;
  let temp = 36.5;

  const interval = setInterval(() => {
    hr += (Math.random() * 4 - 2);
    if (hr > 150) hr = 150;
    if (hr < 110) hr = 110;

    spo2 += (Math.random() * 2 - 1);
    if (spo2 > 100) spo2 = 100;
    if (spo2 < 93) spo2 = 93; 

    temp += (Math.random() * 0.2 - 0.1);
    if (temp > 37.5) temp = 37.5;
    if (temp < 36.0) temp = 36.0;

    const data = {
      heartRate: Math.round(hr),
      respiratoryRate: Math.round(hr / 4),
      oxygenSaturation: Math.round(spo2),
      temperature: temp,
      activity: 'Reposo' as const
    };

    evaluateBiometrics(data, deviceId);
  }, 2000);

  simulationIntervals[deviceId] = interval;
};
