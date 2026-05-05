import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
  /** Alertas de signos vitales fuera de rango */
  vitals: boolean;
  /** Avisos de sensor / ESP desconectado */
  conexion: boolean;
  /** Recordatorios y avisos de batería */
  comunes: boolean;
  /** Alertas de emergencia máxima prioridad */
  urgencias: boolean;
  /** Sonido en las notificaciones */
  sonido: boolean;
  /** Vibración en las notificaciones */
  vibracion: boolean;
}

const STORAGE_KEY = '@tinycare:notification_settings';

const DEFAULT_SETTINGS: NotificationSettings = {
  vitals: true,
  conexion: true,
  comunes: true,
  urgencias: true,
  sonido: true,
  vibracion: true,
};

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Cargar desde AsyncStorage al montar
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  // Actualizar un campo y persistir
  const toggle = useCallback(
    async (key: keyof NotificationSettings) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(console.warn);
        return next;
      });
    },
    []
  );

  // Restablecer a valores por defecto
  const resetSettings = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(console.warn);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, toggle, resetSettings, loading };
}
