import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { TC } from "../../components/theme";
import { useNotificationSettings } from "../../src/services/notifications/useNotificationSettings";
import {
  requestNotificationPermissions,
  notifyESPDisconnected,
} from "../../src/services/notifications/NotificationService";
import { database } from "../../src/database";
import { Dispositivo } from "../../src/database/models";

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertLevel = "info" | "warning" | "critical" | "conexion";

interface AlertItem {
  id: string;
  level: AlertLevel;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<
  AlertLevel,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }
> = {
  info: {
    icon: "checkmark-circle",
    color: "#10B981",
    bg: "#E6FAF5",
    label: "Info",
  },
  warning: {
    icon: "warning",
    color: "#F59E0B",
    bg: "#FEF9EB",
    label: "Advertencia",
  },
  critical: {
    icon: "alert-circle",
    color: "#EF4444",
    bg: "#FEF2F2",
    label: "Crítico",
  },
  conexion: {
    icon: "bluetooth",
    color: "#6366F1",
    bg: "#EEF2FF",
    label: "Conexión",
  },
};

// Alertas de ejemplo (mock) — en producción vendrían de la BD alertas_medicas
const MOCK_ALERTS: AlertItem[] = [
  {
    id: "1",
    level: "critical",
    title: "Taquicardia Neonatal",
    body: "FC: 185 LPM — por encima del umbral crítico de 180 LPM",
    time: "Hace 8 min",
    read: false,
  },
  {
    id: "2",
    level: "warning",
    title: "SpO₂ Baja",
    body: "Saturación: 93% — umbral recomendado ≥ 95%",
    time: "Hace 22 min",
    read: false,
  },
  {
    id: "3",
    level: "conexion",
    title: "Sensor Desconectado",
    body: "El monitor BLE perdió conexión por 3 minutos",
    time: "Hace 1 h",
    read: true,
  },
  {
    id: "4",
    level: "info",
    title: "Temperatura Normal",
    body: "Temp: 36.5 °C — dentro del rango saludable",
    time: "Hace 2 h",
    read: true,
  },
  {
    id: "5",
    level: "warning",
    title: "Batería del sensor baja",
    body: "El ESP32 tiene un 18% de batería restante",
    time: "Hace 3 h",
    read: true,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const AlertCard: React.FC<{ item: AlertItem; onRead: (id: string) => void }> =
  ({ item, onRead }) => {
    const cfg = LEVEL_CONFIG[item.level];
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
      if (!item.read) {
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.6,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onRead(item.id));
      }
    };

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handlePress}
          style={[
            styles.alertCard,
            item.read && styles.alertCardRead,
          ]}
        >
          {/* Level dot */}
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}

          {/* Icon */}
          <View style={[styles.alertIconBox, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={22} color={cfg.color} />
          </View>

          {/* Content */}
          <View style={styles.alertContent}>
            <View style={styles.alertTopRow}>
              <View style={[styles.levelChip, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.levelChipText, { color: cfg.color }]}>
                  {cfg.label}
                </Text>
              </View>
              <Text style={styles.alertTime}>{item.time}</Text>
            </View>
            <Text
              style={[styles.alertTitle, item.read && styles.alertTitleRead]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.alertBody} numberOfLines={2}>
              {item.body}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

// ─── Settings Row ─────────────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor,
  iconBg,
  label,
  sublabel,
  value,
  onToggle,
  disabled = false,
}) => (
  <View style={styles.settingsRow}>
    <View style={[styles.settingsIconBox, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingsText}>
      <Text style={[styles.settingsLabel, disabled && { opacity: 0.45 }]}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={styles.settingsSublabel}>{sublabel}</Text>
      ) : null}
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
      trackColor={{ false: "#E5E7EB", true: TC.vitalHeart + "60" }}
      thumbColor={value ? TC.vitalHeart : "#D1D5DB"}
      ios_backgroundColor="#E5E7EB"
    />
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, toggle, loading } = useNotificationSettings();

  const [alerts, setAlerts] = useState<AlertItem[]>(MOCK_ALERTS);
  const [espConnected, setEspConnected] = useState<boolean | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);

  const [activeTab, setActiveTab] = useState<"alertas" | "config">("alertas");

  const unreadCount = alerts.filter((a) => !a.read).length;

  // ── Check notification permissions on mount ─────────────────────────────────
  useEffect(() => {
    requestNotificationPermissions().then(setPermissionsGranted);
  }, []);

  // ── Check ESP connection status ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const dispositivosCol = database.collections.get<Dispositivo>("dispositivos");
      const sub = dispositivosCol
        .query()
        .observe()
        .subscribe((dispositivos) => {
          const active = dispositivos.some((d) => d.estado === "activo");
          setEspConnected(active);
        });
      return () => sub.unsubscribe();
    }, [])
  );

  const markRead = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const testESPAlert = useCallback(async () => {
    await notifyESPDisconnected("tu bebé");
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>TinyCare</Text>
          <Text style={styles.headerTitle}>Alertas</Text>
        </View>
        {unreadCount > 0 && activeTab === "alertas" && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Permissions Banner ─────────────────────────────────────────────── */}
      {permissionsGranted === false && (
        <View style={styles.permBanner}>
          <Ionicons name="notifications-off" size={18} color="#B45309" />
          <Text style={styles.permBannerText}>
            Las notificaciones están desactivadas en ajustes del sistema.
          </Text>
        </View>
      )}

      {/* ── ESP Disconnect Banner ──────────────────────────────────────────── */}
      {espConnected === false && (
        <View style={styles.espBanner}>
          <View style={styles.espIconBox}>
            <Ionicons name="bluetooth-outline" size={20} color="#6366F1" />
          </View>
          <View style={styles.espTextCol}>
            <Text style={styles.espTitle}>Sensor no conectado</Text>
            <Text style={styles.espSub}>
              Sin ESP conectado no hay alertas vitales del bebé.
            </Text>
          </View>
          {settings.conexion && (
            <TouchableOpacity
              style={styles.espTestBtn}
              activeOpacity={0.8}
              onPress={testESPAlert}
            >
              <Text style={styles.espTestText}>Avisar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Tab Switcher ───────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tab, activeTab === "alertas" && styles.tabActive]}
          onPress={() => setActiveTab("alertas")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "alertas" && styles.tabLabelActive,
            ]}
          >
            Alertas
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tab, activeTab === "config" && styles.tabActive]}
          onPress={() => setActiveTab("config")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "config" && styles.tabLabelActive,
            ]}
          >
            Configuración
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ════════════════ TAB: ALERTAS ═══════════════════════════════════ */}
        {activeTab === "alertas" && (
          <>
            {/* Empty state when all read */}
            {alerts.every((a) => a.read) && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={36}
                    color={TC.textMuted}
                  />
                </View>
                <Text style={styles.emptyTitle}>Todo en orden</Text>
                <Text style={styles.emptySub}>
                  No tienes alertas pendientes por revisar.
                </Text>
              </View>
            )}

            {/* Unread section */}
            {alerts.some((a) => !a.read) && (
              <>
                <Text style={styles.sectionLabel}>Sin leer</Text>
                {alerts
                  .filter((a) => !a.read)
                  .map((item) => (
                    <AlertCard key={item.id} item={item} onRead={markRead} />
                  ))}
              </>
            )}

            {/* Read section */}
            {alerts.some((a) => a.read) && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                  Anteriores
                </Text>
                {alerts
                  .filter((a) => a.read)
                  .map((item) => (
                    <AlertCard key={item.id} item={item} onRead={markRead} />
                  ))}
              </>
            )}
          </>
        )}

        {/* ════════════════ TAB: CONFIG ════════════════════════════════════ */}
        {activeTab === "config" && !loading && (
          <>
            {/* ESP warning when disconnected */}
            {espConnected === false && (
              <View style={styles.configWarningBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#B45309"
                />
                <Text style={styles.configWarningText}>
                  Sin sensor BLE, las alertas de signos vitales no funcionarán.
                  Solo recibirás avisos de desconexión.
                </Text>
              </View>
            )}

            {/* Group: Alertas de salud */}
            <Text style={styles.sectionLabel}>Alertas de salud</Text>
            <View style={styles.settingsCard}>
              <SettingsRow
                icon="pulse"
                iconColor="#EF4444"
                iconBg="#FEF2F2"
                label="Signos vitales"
                sublabel="FC, SpO₂, temperatura fuera de rango"
                value={settings.vitals}
                onToggle={() => toggle("vitals")}
                disabled={espConnected === false}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="alert-circle"
                iconColor="#EF4444"
                iconBg="#FEF2F2"
                label="Urgencias"
                sublabel="Alertas críticas de máxima prioridad"
                value={settings.urgencias}
                onToggle={() => toggle("urgencias")}
                disabled={espConnected === false}
              />
            </View>

            {/* Group: Sensor */}
            <Text style={styles.sectionLabel}>Sensor & Conectividad</Text>
            <View style={styles.settingsCard}>
              <SettingsRow
                icon="bluetooth"
                iconColor="#6366F1"
                iconBg="#EEF2FF"
                label="Estado del sensor"
                sublabel="Aviso cuando el ESP se desconecta o reconecta"
                value={settings.conexion}
                onToggle={() => toggle("conexion")}
              />
            </View>

            {/* Group: Generales */}
            <Text style={styles.sectionLabel}>Generales</Text>
            <View style={styles.settingsCard}>
              <SettingsRow
                icon="notifications"
                iconColor={TC.vitalHeart}
                iconBg={TC.vitalHeart + "18"}
                label="Avisos comunes"
                sublabel="Recordatorios y estado de batería"
                value={settings.comunes}
                onToggle={() => toggle("comunes")}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="volume-high"
                iconColor={TC.vitalOxygen}
                iconBg={TC.vitalOxygen + "20"}
                label="Sonido"
                sublabel="Reproducir audio en las notificaciones"
                value={settings.sonido}
                onToggle={() => toggle("sonido")}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="phone-portrait"
                iconColor={TC.vitalActivity}
                iconBg={TC.vitalActivity + "20"}
                label="Vibración"
                sublabel="Vibrar al recibir alertas"
                value={settings.vibracion}
                onToggle={() => toggle("vibracion")}
              />
            </View>

            {/* Info footer */}
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={TC.textMuted}
              />
              <Text style={styles.infoBoxText}>
                Las notificaciones de urgencia siempre se enviarán,
                independientemente de la configuración de sonido, si el sensor
                está conectado.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TC.bg,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: TC.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.8,
  },
  markAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TC.vitalHeart + "15",
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: TC.vitalHeart,
  },

  /* Permissions banner */
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  permBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
    lineHeight: 18,
  },

  /* ESP Banner */
  espBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    gap: 12,
  },
  espIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  espTextCol: {
    flex: 1,
  },
  espTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3730A3",
    marginBottom: 2,
  },
  espSub: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4338CA",
    lineHeight: 16,
  },
  espTestBtn: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  espTestText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },

  /* Tab bar */
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#F0EBF0",
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 13,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#FFF",
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: TC.textMuted,
  },
  tabLabelActive: {
    color: TC.textDark,
  },
  badge: {
    backgroundColor: TC.vitalTemp,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* Scroll */
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  /* Section label */
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: TC.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },

  /* Alert card */
  alertCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  alertCardRead: {
    opacity: 0.6,
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
  },
  alertTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  levelChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelChipText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 12,
    fontWeight: "500",
    color: TC.textMuted,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  alertTitleRead: {
    fontWeight: "600",
    color: TC.textBody,
  },
  alertBody: {
    fontSize: 13,
    fontWeight: "500",
    color: TC.textBody,
    lineHeight: 18,
  },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: TC.inputBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
  },
  emptySub: {
    fontSize: 15,
    fontWeight: "500",
    color: TC.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },

  /* Settings */
  settingsCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  settingsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsText: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: TC.textDark,
    marginBottom: 2,
  },
  settingsSublabel: {
    fontSize: 12,
    fontWeight: "500",
    color: TC.textMuted,
    lineHeight: 16,
  },
  rowDivider: {
    height: 1,
    backgroundColor: TC.inputBorder,
    marginLeft: 70,
  },

  /* Config warning box */
  configWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  configWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
    lineHeight: 18,
  },

  /* Info box */
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    backgroundColor: TC.inputBg,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: TC.textMuted,
    lineHeight: 18,
  },
});
