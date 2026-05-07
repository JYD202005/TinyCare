import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TC } from "../../components/theme";
import { database } from "../../src/database";
import { AlertaMedica, Dispositivo } from "../../src/database/models";

// ─── Config de niveles ────────────────────────────────────────────────────────

type AlertLevel = "Info" | "Advertencia" | "Critico" | "conexion";

const LEVEL_CONFIG: Record<
  AlertLevel,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  Info: {
    icon: "checkmark-circle",
    color: "#10B981",
    bg: "#E6FAF5",
  },
  Advertencia: {
    icon: "warning",
    color: "#F59E0B",
    bg: "#FEF9EB",
  },
  Critico: {
    icon: "alert-circle",
    color: "#EF4444",
    bg: "#FEF2F2",
  },
  conexion: {
    icon: "bluetooth",
    color: "#6366F1",
    bg: "#EEF2FF",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Justo ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  return `Hace ${Math.floor(hrs / 24)} d`;
}

// ─── MODO DEMO: SAZED ────────────────────────────────────────────────────────
const MOCK_ALERTS_FOR_SAZED: any[] = [
  {
    id: 'demo-1',
    tipoAlerta: 'Taquicardia Neonatal',
    mensajeMedico: 'FC detectada: 168 LPM. El límite normal es 160. Verifique si el bebé está llorando o tiene fiebre.',
    nivel: 'Advertencia',
    timestampEvento: Date.now() - 1000 * 60 * 45, // hace 45 min
    leida: false,
  },
  {
    id: 'demo-2',
    tipoAlerta: 'Hipoxemia (SpO2)',
    mensajeMedico: 'Nivel detectado: 91%. Una saturación menor al 92% se considera patológica en neonatos.',
    nivel: 'Critico',
    timestampEvento: Date.now() - 1000 * 60 * 120, // hace 2h
    leida: true,
  },
  {
    id: 'demo-3',
    tipoAlerta: 'Hipotermia Leve',
    mensajeMedico: 'Temperatura: 36.2°C. El rango normal axilar es 36.5-36.8°C. Abrigue al bebé.',
    nivel: 'Advertencia',
    timestampEvento: Date.now() - 1000 * 60 * 300, // hace 5h
    leida: true,
  }
];

// ─── AlertCard ────────────────────────────────────────────────────────────────

const AlertCard: React.FC<{
  item: AlertaMedica;
  onRead: (id: string) => void;
}> = ({ item, onRead }) => {
  const level = (item.nivel as AlertLevel) ?? "Info";
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.Info;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!item.leida) {
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
        style={[styles.alertCard, item.leida && styles.alertCardRead]}
      >
        {/* Unread dot */}
        {!item.leida && (
          <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />
        )}

        {/* Icon */}
        <View style={[styles.alertIconBox, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>

        {/* Content */}
        <View style={styles.alertContent}>
          <View style={styles.alertTopRow}>
            <View style={[styles.levelChip, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.levelChipText, { color: cfg.color }]}>
                {level}
              </Text>
            </View>
            <Text style={styles.alertTime}>
              {formatTimestamp(item.timestampEvento)}
            </Text>
          </View>
          <Text
            style={[styles.alertTitle, item.leida && styles.alertTitleRead]}
            numberOfLines={1}
          >
            {item.tipoAlerta}
          </Text>
          <Text style={styles.alertBody} numberOfLines={2}>
            {item.mensajeMedico}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();

  const [alerts, setAlerts] = useState<AlertaMedica[]>([]);
  const [espConnected, setEspConnected] = useState<boolean>(false);

  // ── Reactive DB subscriptions ──────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const alertasCol =
        database.collections.get<AlertaMedica>("alertas_medicas");
      const dispositivosCol =
        database.collections.get<Dispositivo>("dispositivos");

      // Alertas ordenadas por timestamp descendente
      const subAlerts = alertasCol
        .query()
        .observe()
        .subscribe(async (rows) => {
          let finalAlerts = [...rows];
          
          // Verificar si existe Sazed
          const perfiles = await database.collections.get('perfiles').query().fetch();
          const hasSazed = perfiles.some((p: any) => p.nombreIdentificador === 'Sazed');
          
          if (hasSazed) {
            finalAlerts = [...finalAlerts, ...MOCK_ALERTS_FOR_SAZED];
          }

          const sorted = finalAlerts.sort(
            (a, b) => b.timestampEvento - a.timestampEvento,
          );
          setAlerts(sorted);
        });

      // Estado de conexión del sensor
      const subDevices = dispositivosCol
        .query()
        .observe()
        .subscribe(async (dispositivos) => {
          const connected = dispositivos.some((d) => d.estado === "activo");
          const perfiles = await database.collections.get('perfiles').query().fetch();
          const hasSazed = perfiles.some((p: any) => p.nombreIdentificador === 'Sazed');
          
          setEspConnected(connected || hasSazed);
        });

      return () => {
        subAlerts.unsubscribe();
        subDevices.unsubscribe();
      };
    }, []),
  );

  // ── Marcar como leída en DB ────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    try {
      const alertasCol =
        database.collections.get<AlertaMedica>("alertas_medicas");
      const alerta = await alertasCol.find(id);
      await database.write(async () => {
        await alerta.update((a) => {
          a.leida = true;
        });
      });
    } catch (e) {
      console.warn("[AlertsScreen] Error marcando alerta leída:", e);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const alertasCol =
        database.collections.get<AlertaMedica>("alertas_medicas");
      const unread = alerts.filter((a) => !a.leida);
      await database.write(async () => {
        for (const a of unread) {
          await a.update((row) => {
            row.leida = true;
          });
        }
      });
    } catch (e) {
      console.warn("[AlertsScreen] Error marcando todas leídas:", e);
    }
  }, [alerts]);

  const unreadCount = alerts.filter((a) => !a.leida).length;
  const unread = alerts.filter((a) => !a.leida);
  const read = alerts.filter((a) => a.leida);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>TinyCare</Text>
          <Text style={styles.headerTitle}>Alertas</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── ESP Desconectado banner ────────────────────────────────────────── */}
      {!espConnected && (
        <View style={styles.espBanner}>
          <View style={styles.espIconBox}>
            <Ionicons name="bluetooth-outline" size={20} color="#6366F1" />
          </View>
          <View style={styles.espTextCol}>
            <Text style={styles.espTitle}>Sensor no conectado</Text>
            <Text style={styles.espSub}>
              Sin sensores activos no hay alertas de signos vitales.
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Estado vacío ─────────────────────────────────────────────────── */}
        {alerts.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="notifications-off-outline"
                size={36}
                color={TC.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>Sin alertas</Text>
            <Text style={styles.emptySub}>
              {espConnected
                ? "Todos los signos vitales están dentro del rango normal."
                : "Vincula un sensor para recibir alertas médicas en tiempo real."}
            </Text>
          </View>
        )}

        {/* ── Sin leer ─────────────────────────────────────────────────────── */}
        {unread.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Sin leer</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread.length}</Text>
              </View>
            </View>
            {unread.map((item) => (
              <AlertCard key={item.id} item={item} onRead={markRead} />
            ))}
          </>
        )}

        {/* ── Anteriores ───────────────────────────────────────────────────── */}
        {read.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionLabel,
                { marginTop: unread.length > 0 ? 24 : 0 },
              ]}
            >
              Anteriores
            </Text>
            {read.map((item) => (
              <AlertCard key={item.id} item={item} onRead={markRead} />
            ))}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },

  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
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

  /* ESP Banner */
  espBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 12,
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
  espTextCol: { flex: 1 },
  espTitle: {
    fontSize: 14,
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

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: TC.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingLeft: 4,
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
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },

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
  alertCardRead: { opacity: 0.55 },
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
  alertContent: { flex: 1 },
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
  alertTime: { fontSize: 12, fontWeight: "500", color: TC.textMuted },
  alertTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  alertTitleRead: { fontWeight: "600", color: TC.textBody },
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
    maxWidth: 280,
  },
});
