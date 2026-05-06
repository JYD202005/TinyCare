import notifee, { AndroidImportance } from '@notifee/react-native';
import { Biometrics } from '../ble/bleTypes';

const CHANNEL_ID = 'vital-signs-monitoring';
let isForegroundServiceRunning = false;

export const startForegroundMonitoring = async () => {
  if (isForegroundServiceRunning) return;
  const channelId = await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Monitoreo Continuo (Signos Vitales)',
    importance: AndroidImportance.LOW,
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
  if (!isForegroundServiceRunning) return;
  await notifee.stopForegroundService();
  isForegroundServiceRunning = false;
};

export const updateForegroundNotification = async (data: Biometrics) => {
  if (!isForegroundServiceRunning) return;
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
