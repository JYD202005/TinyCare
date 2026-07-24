import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '@/src/database/context';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { setupNotificationChannels, requestNotificationPermissions } from '@/src/services/notifications/NotificationService';
import { initConnectionManager } from '@/src/services/ble/ConnectionManager';
import CareChatBot from '@/components/CareChatBot';

/* Screens where the chatbot should NOT appear */
const HIDDEN_ROUTES = ['/login', '/register', '/(auth)/login', '/(auth)/register', '/onboarding', '/(config)/onboarding'];

function ChatBotGate() {
  const pathname = usePathname();
  const hidden = HIDDEN_ROUTES.some((r) => pathname === r);
  if (hidden) return null;
  return <CareChatBot />;
}

export default function RootLayout() {
  useEffect(() => {
    setupNotificationChannels();
    requestNotificationPermissions();
    const cleanupBLE = initConnectionManager();
    
    return () => {
      cleanupBLE();
    };
  }, []);

  return (
    <AuthProvider>
      <DatabaseProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="register" options={{ presentation: 'modal' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <ChatBotGate />
        <StatusBar style="dark" />
      </DatabaseProvider>
    </AuthProvider>
  );
}
