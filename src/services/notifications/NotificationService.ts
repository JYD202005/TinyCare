import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configuración de cómo se manejan las notificaciones en primer plano (foreground)
// shouldShowBanner y shouldShowList son requeridos por NotificationBehavior en iOS 15+
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // Compatibilidad legacy
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,  // iOS 15+: muestra banner temporal
    shouldShowList: true,    // iOS 15+: muestra en la lista de notificaciones
  }),
});

// ─── Canales Android ──────────────────────────────────────────────────────────

export const setupNotificationChannels = async () => {
  if (Platform.OS === "android") {
    // Canal Verde (Comunes) - Baja prioridad, silencioso
    await Notifications.setNotificationChannelAsync("comunes", {
      name: "Comunes",
      description: "Avisos recurrentes y estado normal",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#10B981",
    });

    // Canal Amarillo (Advertencias) - Alta prioridad, vibración
    await Notifications.setNotificationChannelAsync("advertencias", {
      name: "Advertencias",
      description: "Cambios importantes, estado de batería o sensores",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F59E0B",
    });

    // Canal Rojo (Urgencias) - Máxima prioridad, sonido fuerte
    await Notifications.setNotificationChannelAsync("urgencias", {
      name: "Urgencias",
      description: "Emergencias médicas, atención inmediata",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: "#EF4444",
    });

    // Canal de conexión (ESP) - Media prioridad
    await Notifications.setNotificationChannelAsync("conexion", {
      name: "Conexión",
      description: "Estado del sensor ESP / Bluetooth",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#F59E0B",
    });
  }
};

// ─── Permisos ──────────────────────────────────────────────────────────────────

export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Permisos de notificación denegados.");
    return false;
  }

  return true;
};

// ─── Notificaciones por tipo ──────────────────────────────────────────────────

/** Aviso de estado normal / informativo */
export const notifyCommon = async (title: string, body: string, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `💚 ${title}`,
      body,
      data: { tipo: "comun", ...data },
      color: "#10B981",
    },
    trigger: null,
  });
};

/** Advertencia importante (batería, sensor, etc.) */
export const notifyWarning = async (title: string, body: string, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ ${title}`,
      body,
      data: { tipo: "advertencia", ...data },
      color: "#F59E0B",
      sound: true,
    },
    trigger: Platform.OS === "android"
      ? { channelId: "advertencias", seconds: 1 } as any
      : null,
  });
};

/** Emergencia médica - máxima prioridad */
export const notifyEmergency = async (title: string, body: string, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 URGENCIA: ${title}`,
      body,
      data: { tipo: "urgencia", ...data },
      color: "#EF4444",
      sound: true,
      interruptionLevel: "critical", // iOS 15+
    },
    trigger: Platform.OS === "android"
      ? { channelId: "urgencias", seconds: 1 } as any
      : null,
  });
};

/**
 * Notificación de ESP desconectado.
 * Se dispara cuando el sensor BLE pierde conexión con la app.
 */
export const notifyESPDisconnected = async (babyName = "el bebé") => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📡 Sensor Desconectado",
      body: `El monitor de ${babyName} se desconectó. Verifica el sensor BLE.`,
      data: { tipo: "conexion", estado: "desconectado" },
      color: "#F59E0B",
      sound: true,
    },
    trigger: Platform.OS === "android"
      ? { channelId: "conexion", seconds: 1 } as any
      : null,
  });
};

/**
 * Notificación de ESP reconectado.
 */
export const notifyESPReconnected = async (babyName = "el bebé") => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "✅ Sensor Reconectado",
      body: `El monitor de ${babyName} está activo y enviando datos.`,
      data: { tipo: "conexion", estado: "conectado" },
      color: "#10B981",
      sound: false,
    },
    trigger: Platform.OS === "android"
      ? { channelId: "conexion", seconds: 1 } as any
      : null,
  });
};
