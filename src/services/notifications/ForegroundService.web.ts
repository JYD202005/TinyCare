import { Biometrics } from '../ble/bleTypes';

export const startForegroundMonitoring = async () => {
  console.log('Foreground monitoring is not supported on the web.');
};

export const stopForegroundMonitoring = async () => {
  console.log('Foreground monitoring is not supported on the web.');
};

export const updateForegroundNotification = async (data: Biometrics) => {
  // No-op en web
};
