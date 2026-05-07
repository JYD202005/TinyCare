import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn("expo-notifications module could not be loaded");
  }
}

/**
 * REGISTRO DE CANAL (Aseguramos que exista antes de usarlo)
 */
export const setupNotificationChannels = async () => {
  if (Platform.OS === "android" && Notifications) {
    // Canal para recordatorios de agenda (prioridad alta)
    await Notifications.setNotificationChannelAsync("agenda_channel", {
      name: "Recordatorios de Agenda",
      description: "Notificaciones de citas y tareas programadas",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6366F1",
    });
    // Canal para alertas médicas críticas (prioridad máxima, ignora DND)
    await Notifications.setNotificationChannelAsync("emergency_channel", {
      name: "Alertas Médicas Críticas",
      description: "Alertas de signos vitales fuera de rango — no silenciar",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#EF4444",
      bypassDnd: true,
    });
  }
};

/**
 * PROGRAMACIÓN DE RECORDATORIOS
 * expo-notifications >=0.29 (SDK 51+) requiere el campo `type` explícito en el trigger.
 * Sin él, el trigger es inválido y la notificación se dispara de inmediato.
 */
export const scheduleReminder = async (id: string, title: string, body: string, date: Date) => {
  if (!Notifications || Platform.OS === "web") return;

  // 1. Asegurar que el canal existe
  await setupNotificationChannels();

  // 2. Calcular segundos hasta el evento (método más compatible con Android)
  const targetMs = new Date(date).getTime();
  // Zerear segundos para mayor precisión en la comparación
  const cleanTargetMs = targetMs - (targetMs % 60000);
  const secondsUntil = Math.floor((cleanTargetMs - Date.now()) / 1000);

  if (secondsUntil <= 0) {
    console.log("[Reminder] Fecha en el pasado o presente. No se programa notificación.");
    return;
  }

  try {
    console.log(`[Reminder] Programando "${title}" en ${secondsUntil}s (${new Date(cleanTargetMs).toLocaleString()})`);

    await Notifications.cancelScheduledNotificationAsync(id);

    // En expo-notifications 0.29+ (SDK 51+) el trigger REQUIERE `type` explícito.
    // Sin él, el trigger es ignorado y la notificación se lanza inmediatamente.
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `📅 Agenda: ${title}`,
        body,
        data: { tipo: "reminder", id },
        color: "#6366F1",
        sound: "default",
        android: { channelId: "agenda_channel" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
        repeats: false,
        channelId: "agenda_channel",
      } as any,
    });

    console.log("[Reminder] ✅ Programada para dispararse en el momento correcto.");
  } catch (error) {
    console.error("[Reminder] Error crítico al programar:", error);
  }
};

export const cancelReminder = async (id: string) => {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {}
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

export const notifyCommon = async (title: string, body: string, data = {}) => {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💚 ${title}`,
        body,
        data: { tipo: 'comun', ...data },
        color: '#10B981',
        android: { channelId: 'agenda_channel' },
      },
      trigger: null, // Inmediata — correcto para avisos de estado
    });
  } catch (e) {
    console.warn('[NotificationService] notifyCommon error:', e);
  }
};

export const notifyWarning = async (title: string, body: string, data = {}) => {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ ${title}`,
        body,
        data: { tipo: 'warning', ...data },
        color: '#F59E0B',
        android: { channelId: 'agenda_channel' },
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[NotificationService] notifyWarning error:', e);
  }
};

export const notifyEmergency = async (title: string, body: string, data = {}) => {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 ${title}`,
        body,
        data: { tipo: 'emergency', ...data },
        color: '#EF4444',
        sound: 'default',
        android: { channelId: 'emergency_channel' },
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[NotificationService] notifyEmergency error:', e);
  }
};
