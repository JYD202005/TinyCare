import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import DashboardCard, {
  VITALS,
  VitalType,
} from "../../components/DashboardCard";
import {
  getScreenTopPadding,
  SharedStyles,
  Typography,
} from "../../components/styles";
import { TC } from "../../components/theme";
import { database } from "../../src/database";
import { Dispositivo, Perfil } from "../../src/database/models";
import { useSync } from "../../src/hooks/useSync";
import { useTelemetryStats } from "../../src/hooks/useTelemetryStats";
import { useAuth } from "../../src/providers/AuthProvider";
import { subscribeToBiometrics } from "../../src/services/notifications/MonitoringService";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Trend and History data is now fetched from useTelemetryStats

// ─── Smooth Spline Chart ─────────────────────────────────────────────────────

const MiniChart: React.FC<{ data: number[]; color: string }> = ({
  data,
  color,
}) => {
  const W = 300;
  const H = 90;
  const PAD_Y = 14;
  const PAD_X = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Handle case where data array has only 1 element to avoid division by zero
  const safeData = data.length === 1 ? [data[0], data[0]] : data;

  const points = safeData.map((v, i) => {
    const x = PAD_X + (i / (safeData.length - 1)) * (W - PAD_X * 2);
    const y = H - PAD_Y - ((v - min) / range) * (H - PAD_Y * 2);
    return { x, y };
  });

  // Catmull-Rom to Cubic Bezier
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 === points.length ? i + 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  const areaPath = `${d} L ${points[points.length - 1].x},${H} L ${points[0].x},${H} Z`;

  return (
    <Svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ marginTop: 16 }}
    >
      <Defs>
        <LinearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>
      {/* Decorative center line */}
      <Line
        x1="0"
        y1={H / 2}
        x2={W}
        y2={H / 2}
        stroke={color}
        strokeOpacity="0.15"
        strokeDasharray="4 4"
        strokeWidth="2"
      />
      <Path d={areaPath} fill={`url(#grad-${color})`} />
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── Info Card Components ────────────────────────────────────────────────────

const TrendCard: React.FC<{
  vital: VitalType;
  color: string;
  data: number[];
  label?: string;
}> = ({ vital, color, data, label }) => (
  <View style={infoStyles.cardFull}>
    <View style={infoStyles.cardHeader}>
      <View style={[infoStyles.iconBadge, { backgroundColor: color + "18" }]}>
        <Ionicons name="trending-up" size={16} color={color} />
      </View>
      <Text style={infoStyles.cardTitle}>Tendencia de {label} 24h</Text>
    </View>
    <MiniChart data={data.length > 0 ? data : [0]} color={color} />
  </View>
);

const HistoryCard: React.FC<{
  vital: VitalType;
  color: string;
  history: { time: string; value: string }[];
}> = ({ vital, color, history }) => (
  <View style={infoStyles.cardFull}>
    <View style={infoStyles.cardHeader}>
      <View style={[infoStyles.iconBadge, { backgroundColor: color + "18" }]}>
        <Ionicons name="time" size={16} color={color} />
      </View>
      <Text style={infoStyles.cardTitle}>Historial Reciente</Text>
    </View>
    {history.map((item, i) => (
      <View
        key={i}
        style={[
          infoStyles.historyRow,
          i < history.length - 1 && infoStyles.historyBorder,
        ]}
      >
        <Text style={infoStyles.historyTime}>{item.time}</Text>
        <Text style={[infoStyles.historyValue, { color }]}>{item.value}</Text>
      </View>
    ))}
  </View>
);

// ─── Home Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [babies, setBabies] = useState<
    {
      id: string;
      name: string;
      emoji: string;
      connected: boolean;
      deviceId: string | null;
    }[]
  >([
    {
      id: "loading",
      name: "Cargando...",
      emoji: "⏳",
      connected: false,
      deviceId: null,
    },
  ]);
  const [activeBabyIndex, setActiveBabyIndex] = useState(0);
  const activeBaby = babies[activeBabyIndex] || babies[0];

  const [activeVital, setActiveVital] = useState<VitalType>("heart");
  const vitalConfig = VITALS.find((v) => v.key === activeVital)!;
  const { session } = useAuth();
  const { isSyncing, lastSync } = useSync();

  // Re-suscribirse cada vez que la pantalla recibe foco
  // Esto garantiza que cualquier cambio en edit-baby se refleje al regresar
  useFocusEffect(
    useCallback(() => {
      const perfilesCollection = database.collections.get<Perfil>("perfiles");
      const dispositivosCollection =
        database.collections.get<Dispositivo>("dispositivos");

      const subscription = perfilesCollection
        .query()
        .observe()
        .subscribe(async (perfiles) => {
          if (perfiles.length > 0) {
            const allDevices = await dispositivosCollection.query().fetch();

            const loadedBabies = perfiles.map((p) => {
              const hasDevice = allDevices.find((d) => d.idPerfil === p.id);
              return {
                id: p.id,
                name: p.nombreIdentificador || "Bebé",
                emoji: p.avatar || "👶🏻",
                connected: hasDevice ? hasDevice.estado === "activo" : false,
                deviceId: hasDevice ? hasDevice.identificadorHardware : null,
              };
            });
            setBabies(loadedBabies);
            setActiveBabyIndex(0);
          } else {
            setBabies([
              {
                id: "empty",
                name: "Sin Perfil",
                emoji: "👶",
                connected: false,
                deviceId: null,
              },
            ]);
          }
        });

      // Cleanup al perder foco o desmontar
      return () => subscription.unsubscribe();
    }, []),
  );

  const [liveData, setLiveData] = useState<Record<string, any>>({});

  const { data24H, averages24H, alertsToday } = useTelemetryStats(
    activeBaby?.id,
    activeBaby?.name,
  );

  // --- MODO DEMO: Simulación de datos para Sazed (Sincronizado con evaluadorMedico.ts) ---
  const [demoVitals, setDemoVitals] = useState({
    hr: 130,
    spo2: 98,
    temp: 36.5,
    fr: 45,
    activity: "90",
  });

  useEffect(() => {
    if (activeBaby?.name !== "Sazed") return;

    // Disparar la alerta con un tiempo de respuesta de 1 segundo desde que se carga
    const timeout = setTimeout(() => {
      Alert.alert(
        "¡Alerta de Postura!",
        "Rotación de riesgo detectada (90 Grados).",
        [{ text: "Entendido" }],
      );
    }, 1000);

    return () => clearTimeout(timeout);
  }, [activeBaby?.name]);

  useEffect(() => {
    const unsub = subscribeToBiometrics((deviceId, data) => {
      setLiveData((prev) => ({ ...prev, [deviceId]: data }));
    });
    return unsub;
  }, []);

  // Si es Sazed, usamos datos simulados si no hay un sensor real conectado
  const currentDeviceData =
    activeBaby?.name === "Sazed"
      ? {
          heartRate: demoVitals.hr,
          oxygenSaturation: demoVitals.spo2,
          temperature: demoVitals.temp,
          respiratoryRate: demoVitals.fr,
          activity: demoVitals.activity,
        }
      : activeBaby?.deviceId
        ? liveData[activeBaby.deviceId]
        : null;

  const getTrendData = (vital: VitalType) => {
    switch (vital) {
      case "heart":
        return data24H.hr;
      case "oxygen":
        return data24H.spo2;
      case "temp":
        return data24H.temp;
      case "activity":
        return data24H.posture;
      default:
        return [0];
    }
  };

  const getHistoryData = (vital: VitalType) => {
    return data24H.history.map((h) => ({
      time: h.time,
      value:
        vital === "heart"
          ? h.hr
          : vital === "oxygen"
            ? h.spo2
            : vital === "temp"
              ? h.temp
              : h.activity,
    }));
  };

  // Adapt Biometrics data to VitalConfig array
  const activeBabyVitals = currentDeviceData
    ? [
        {
          key: "heart" as VitalType,
          label: "Ritmo Cardíaco",
          value: `${currentDeviceData.heartRate}`,
          unit: "LPM",
          color: TC.vitalHeart,
          colorDim: TC.vitalHeart + "30",
          icon: "heart" as keyof typeof Ionicons.glyphMap,
          progress: Math.min((currentDeviceData.heartRate - 60) / 80, 1),
        },
        {
          key: "oxygen" as VitalType,
          label: "Oxigenación",
          value: `${currentDeviceData.oxygenSaturation}`,
          unit: "%",
          color: TC.vitalOxygen,
          colorDim: TC.vitalOxygen + "30",
          icon: "water" as keyof typeof Ionicons.glyphMap,
          progress: currentDeviceData.oxygenSaturation / 100,
        },
        {
          key: "temp" as VitalType,
          label: "Temperatura",
          value: `${currentDeviceData.temperature.toFixed(1)}`,
          unit: "°C",
          color: TC.vitalTemp,
          colorDim: TC.vitalTemp + "30",
          icon: "thermometer" as keyof typeof Ionicons.glyphMap,
          progress: Math.min((currentDeviceData.temperature - 35) / 3, 1),
        },
        {
          key: "activity" as VitalType,
          label: "Postura",
          value: `${currentDeviceData.activity}`,
          unit: currentDeviceData.activity === "Normal" ? "" : "°",
          color: TC.vitalActivity,
          colorDim: TC.vitalActivity + "30",
          icon: "fitness" as keyof typeof Ionicons.glyphMap,
          progress: currentDeviceData.activity === "90" ? 1.0 : 0.5,
        },
      ]
    : undefined;

  return (
    <View style={SharedStyles.screenRoot}>
      <ScrollView
        contentContainerStyle={[
          SharedStyles.screenScrollContent,
          { paddingTop: getScreenTopPadding(insets.top), gap: 10 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* ── Header ── */}
        <View style={SharedStyles.screenHeader}>
          <View style={styles.headerLeft}>
            <Text style={Typography.eyebrow}>HOLA DE NUEVO,</Text>
            <Text style={Typography.screenTitle}>Panel de Salud</Text>
          </View>
        </View>

        {/* ── Profiles Selector ── */}
        <View style={styles.profilesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.profilesContainer}
          >
            {babies.map((b, index) => {
              const isActive = index === activeBabyIndex;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut,
                    );
                    setActiveBabyIndex(index);
                  }}
                  style={[
                    styles.profilePill,
                    isActive && styles.profilePillActive,
                  ]}
                >
                  <View
                    style={[
                      styles.profileEmojiBox,
                      isActive && styles.profileEmojiBoxActive,
                    ]}
                  >
                    <Text style={styles.profileEmoji}>{b.emoji}</Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text
                      style={[
                        styles.profileName,
                        isActive && styles.profileNameActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                    {isActive && (
                      <Text style={styles.profileStatus}>Monitoreando</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.profileAddBtn}
            >
              <View style={styles.profileAddIcon}>
                <Ionicons name="add" size={24} color={TC.vitalHeart} />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Cloud Sync Banner ── */}
        {!session ? (
          <View style={styles.cloudBanner}>
            <View style={styles.cloudIconBox}>
              <Ionicons name="cloud-offline" size={18} color={TC.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Modo Local Activo</Text>
              <Text style={styles.bannerSub} numberOfLines={1}>
                Datos solo en este dispositivo
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              style={styles.bannerActionBtn}
            >
              <Text style={styles.bannerActionText}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cloudBanner}>
            <View style={styles.cloudIconBox}>
              <Ionicons name="cloud-done" size={18} color={TC.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                Nube Activa {isSyncing && " (Sinc...)"}
              </Text>
              <Text style={styles.bannerSub} numberOfLines={1}>
                {session.user?.email || "Conectado"}
              </Text>
            </View>
          </View>
        )}

        {/* ── Bluetooth Banner ── */}
        {!activeBaby.connected && activeBaby.name !== "Sazed" ? (
          <View style={styles.bleBannerDisconnected}>
            <View style={styles.bleIconBoxDisconnected}>
              <Ionicons name="bluetooth" size={18} color="#FFF" />
            </View>
            <View style={styles.bleTextCol}>
              <Text style={styles.bleTitle}>Sensor Desconectado</Text>
              <Text style={styles.bleSub} numberOfLines={1}>
                Vincular monitor para {activeBaby.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bleBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/sensor-management")}
            >
              <Text style={styles.bleBtnText}>Vincular</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bleBannerConnected}>
            <View style={styles.bleIconBoxConnected}>
              <Ionicons name="bluetooth" size={18} color={TC.vitalHeart} />
            </View>
            <View style={styles.bleTextCol}>
              <Text style={styles.bleTitleConnected}>Monitor Conectado</Text>
              <Text style={styles.bleSub} numberOfLines={1}>
                Recibiendo datos de {activeBaby.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bleBtnOutline}
              activeOpacity={0.8}
              onPress={() => router.push("/sensor-management")}
            >
              <Text style={styles.bleBtnOutlineText}>Ajustes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Dashboard Card (ring + inline stats) ── */}
        <View style={styles.mainCardContainer}>
          <DashboardCard
            activeVital={activeVital}
            onVitalChange={setActiveVital}
            liveData={activeBabyVitals}
            averages={averages24H}
            alertsCount={alertsToday}
          />
        </View>

        {/* ── Info Cards ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Detalles de {vitalConfig.label}
          </Text>
        </View>

        {/* 24h Trend — full width */}
        <TrendCard
          vital={activeVital}
          color={vitalConfig.color}
          data={getTrendData(activeVital)}
          label={vitalConfig.label}
        />

        {/* History — full width */}
        <HistoryCard
          vital={activeVital}
          color={vitalConfig.color}
          history={getHistoryData(activeVital)}
        />
      </ScrollView>
    </View>
  );
}

// ─── Page Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TC.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 120,
    gap: 10,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  headerLeft: {
    flex: 1,
  },
  profilesWrapper: {
    marginHorizontal: -16,
    marginBottom: 2,
    marginTop: -4,
  },
  profilesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TC.card,
    padding: 5,
    paddingRight: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    height: 50,
  },
  profilePillActive: {
    backgroundColor: TC.vitalHeart,
    borderColor: TC.vitalHeart,
    shadowColor: TC.vitalHeart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  profileEmojiBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TC.trackBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  profileEmojiBoxActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  profileEmoji: {
    fontSize: 18,
  },
  profileInfo: {
    justifyContent: "center",
  },
  profileName: {
    fontSize: 14,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.3,
  },
  profileNameActive: {
    color: "#FFF",
  },
  profileStatus: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },
  profileAddBtn: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: TC.card,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
    borderStyle: "dashed",
    marginLeft: 2,
  },
  profileAddIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TC.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  babyName: {
    fontSize: 11,
    fontWeight: "700",
    color: TC.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.6,
  },

  /* Cloud Sync Banner */
  cloudBanner: {
    backgroundColor: TC.accentLight,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderCurve: "continuous" as any,
  },
  cloudIconBox: {
    backgroundColor: TC.card,
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TC.textDark,
  },
  bannerSub: {
    fontSize: 11,
    color: TC.textBody,
    marginTop: 1,
  },
  bannerActionBtn: {
    backgroundColor: TC.card,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TC.accent + "30",
  },
  bannerActionText: {
    color: TC.accent,
    fontWeight: "700",
    fontSize: 12,
  },

  /* Bluetooth Banners */
  bleBannerDisconnected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TC.vitalHeart + "08",
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: TC.vitalHeart + "20",
    borderCurve: "continuous" as any,
  },
  bleIconBoxDisconnected: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: TC.vitalHeart,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderCurve: "continuous" as any,
  },
  bleBannerConnected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TC.accentLight,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: TC.accent + "30",
    borderCurve: "continuous" as any,
  },
  bleIconBoxConnected: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: TC.accent + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderCurve: "continuous" as any,
  },
  bleTextCol: {
    flex: 1,
  },
  bleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TC.vitalHeart,
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  bleTitleConnected: {
    fontSize: 13,
    fontWeight: "700",
    color: TC.accent,
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  bleSub: {
    fontSize: 11,
    color: TC.textBody,
    fontWeight: "500",
  },
  bleBtn: {
    backgroundColor: TC.vitalHeart,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  bleBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  bleBtnOutline: {
    backgroundColor: TC.card,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TC.accent + "30",
  },
  bleBtnOutlineText: {
    color: TC.accent,
    fontWeight: "700",
    fontSize: 12,
  },

  mainCardContainer: {
    marginVertical: 4,
  },

  /* Section */
  sectionHeader: {
    marginTop: 12,
    marginBottom: -4,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
  },

  /* Sleep */
  sleepCard: {
    backgroundColor: TC.card,
    borderRadius: 32,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderCurve: "continuous" as any,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    marginTop: 8,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  sleepIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: TC.vitalOxygen + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderCurve: "continuous" as any,
  },
  sleepText: {
    flex: 1,
  },
  sleepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TC.textDark,
    marginBottom: 4,
  },
  sleepSub: {
    fontSize: 14,
    color: TC.textBody,
    fontWeight: "500",
  },
  chevronBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TC.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Info Card Styles ────────────────────────────────────────────────────────

const infoStyles = StyleSheet.create({
  cardFull: {
    backgroundColor: TC.card,
    borderRadius: 32,
    padding: 24,
    borderCurve: "continuous" as any,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous" as any,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.3,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  historyBorder: {
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
  },
  historyTime: {
    fontSize: 15,
    fontWeight: "600",
    color: TC.textBody,
  },
  historyValue: {
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
