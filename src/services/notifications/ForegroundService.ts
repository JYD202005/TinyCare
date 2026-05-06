import { Biometrics } from '../ble/bleTypes';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notifee: any = null;
let AndroidImportance: any = null;

if (!isExpoGo && Platform.OS !== 'web') {
  try {
    const notifeeModule = require('@notifee/react-native');
    notifee = notifeeModule.default;
    AndroidImportance = notifeeModule.AndroidImportance;
  } catch (error) {
    console.warn("Notifee module could not be loaded", error);
  }
}

const CHANNEL_ID = 'vital-signs-monitoring';
let isForegroundServiceRunning = false;

export const startForegroundMonitoring = async () => {
  if (isForegroundServiceRunning || !notifee) return;
  const channelId = await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Monitoreo Continuo (Signos Vitales)',
    importance: AndroidImportance?.LOW || 2,
  });

  await notifee.displayNotification({
    title: 'TinyCare: Monitoreo Activo',
    body: 'Buscando lectura de signos vitales...',
    android: {
      channelId,
      asForegroundService: true,
      color: '#ff6b6b',
      ongoing: true,
    },
  });
  isForegroundServiceRunning = true;
};

export const stopForegroundMonitoring = async () => {
  if (!isForegroundServiceRunning || !notifee) return;
  await notifee.stopForegroundService();
  isForegroundServiceRunning = false;
};

export const updateForegroundNotification = async (data: Biometrics) => {
  if (!isForegroundServiceRunning || !notifee) return;
  await notifee.displayNotification({
    id: 'monitoring-service',
    title: 'TinyCare: Monitoreo Activo',
    body: `❤️ FC: ${data.heartRate} bpm | 🫁 FR: ${data.respiratoryRate} rpm | 🩸 SpO2: ${data.oxygenSaturation}%`,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      color: '#ff6b6b',
      ongoing: true,
      onlyAlertOnce: true,
    },
  });
};
