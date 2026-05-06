/**
 * useNotificationSettings
 *
 * Almacena preferencias de notificaciones en un singleton de módulo (memoria).
 * Los valores se mantienen durante toda la sesión de la app y se sincronizan
 * entre todos los componentes que usen este hook.
 *
 * No requiere ningún módulo nativo — compatible con el build de desarrollo actual.
 */
import { useState, useEffect, useCallback } from 'react';

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
  /** Recordatorios para ir a ver al bebé */
  recordatoriosBebe: boolean;
  /** Recordatorios para alimentación del bebé */
  recordatoriosAlimentacion: boolean;
  /** Sonidos personalizados para alertas (amarillas/rojas) */
  sonidosPersonalizados: boolean;
  /** Avisos detallados de los sensores */
  avisosSensor: boolean;
  /** Alertas preventivas (Amarillas) */
  alertasAmarillas: boolean;
  /** Alertas críticas (Rojas) */
  alertasRojas: boolean;
}

// ─── Singleton en memoria ─────────────────────────────────────────────────────
// Se inicializa una sola vez por sesión de app, independiente del ciclo de vida
// de los componentes.

const DEFAULT_SETTINGS: NotificationSettings = {
  vitals: true,
  conexion: true,
  comunes: true,
  urgencias: true,
  sonido: true,
  vibracion: true,
  recordatoriosBebe: true,
  recordatoriosAlimentacion: true,
  sonidosPersonalizados: false,
  avisosSensor: true,
  alertasAmarillas: true,
  alertasRojas: true,
};

// Estado global compartido entre todas las instancias del hook
let _settings: NotificationSettings = { ...DEFAULT_SETTINGS };

// Suscriptores: cualquier componente montado recibe el cambio inmediatamente
type Subscriber = (s: NotificationSettings) => void;
const _subscribers = new Set<Subscriber>();

function _notify() {
  _subscribers.forEach((fn) => fn({ ..._settings }));
}

function _toggle(key: keyof NotificationSettings) {
  _settings = { ..._settings, [key]: !_settings[key] };
  _notify();
}

function _reset() {
  _settings = { ...DEFAULT_SETTINGS };
  _notify();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotificationSettings() {
  // Estado local sincronizado con el singleton
  const [settings, setSettings] = useState<NotificationSettings>({ ..._settings });

  useEffect(() => {
    // Suscribirse a cambios del singleton
    _subscribers.add(setSettings);
    // Sincronizar en caso de que el singleton haya cambiado antes de montar
    setSettings({ ..._settings });
    return () => {
      _subscribers.delete(setSettings);
    };
  }, []);

  const toggle = useCallback((key: keyof NotificationSettings) => {
    _toggle(key);
  }, []);

  const resetSettings = useCallback(() => {
    _reset();
  }, []);

  return { settings, toggle, resetSettings, loading: false };
}
