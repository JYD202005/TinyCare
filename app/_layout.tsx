import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '@/src/database/context';
import { setupNotificationChannels, requestNotificationPermissions } from '@/src/services/notifications/NotificationService';

export default function RootLayout() {
  useEffect(() => {
    setupNotificationChannels();
    requestNotificationPermissions();
  }, []);

  return (
    <DatabaseProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" />
    </DatabaseProvider>
  );
}
