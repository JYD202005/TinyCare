import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { TC } from "../../components/theme";
import DashboardCard, {
  VITALS,
  VitalType,
} from "../../components/DashboardCard";

// ─── Trend Data (mock per vital) ─────────────────────────────────────────────

const TREND_DATA: Record<VitalType, number[]> = {
  heart: [88, 92, 85, 90, 95, 88, 92, 86, 91, 94, 89, 92],
  oxygen: [97, 98, 97, 99, 98, 97, 98, 99, 98, 97, 98, 98],
  temp: [36.4, 36.5, 36.6, 36.5, 36.7, 36.5, 36.4, 36.6, 36.5, 36.5, 36.6, 36.5],
  activity: [3, 5, 2, 4, 6, 3, 2, 5, 4, 3, 2, 4],
};



const HISTORY_DATA: Record<
  VitalType,
  { time: string; value: string }[]
> = {
  heart: [
    { time: "Hace 5 min", value: "92 LPM" },
    { time: "Hace 15 min", value: "88 LPM" },
    { time: "Hace 30 min", value: "91 LPM" },
  ],
  oxygen: [
    { time: "Hace 5 min", value: "98%" },
    { time: "Hace 15 min", value: "97%" },
    { time: "Hace 30 min", value: "98%" },
  ],
  temp: [
    { time: "Hace 5 min", value: "36.5°C" },
    { time: "Hace 15 min", value: "36.6°C" },
    { time: "Hace 30 min", value: "36.4°C" },
  ],
  activity: [
    { time: "Hace 5 min", value: "Calmo" },
    { time: "Hace 15 min", value: "Activo" },
    { time: "Hace 30 min", value: "Calmo" },
  ],
};

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

  const points = data.map((v, i) => {
    const x = PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2);
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
        x1="0" y1={H/2} x2={W} y2={H/2} 
        stroke={color} strokeOpacity="0.15" 
        strokeDasharray="4 4" strokeWidth="2" 
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

const TrendCard: React.FC<{ vital: VitalType; color: string }> = ({
  vital,
  color,
}) => (
  <View style={infoStyles.cardFull}>
    <View style={infoStyles.cardHeader}>
      <View style={[infoStyles.iconBadge, { backgroundColor: color + "18" }]}>
        <Ionicons name="trending-up" size={16} color={color} />
      </View>
      <Text style={infoStyles.cardTitle}>Tendencia 24h</Text>
    </View>
    <MiniChart data={TREND_DATA[vital]} color={color} />
  </View>
);

const HistoryCard: React.FC<{ vital: VitalType; color: string }> = ({
  vital,
  color,
}) => (
  <View style={infoStyles.cardFull}>
    <View style={infoStyles.cardHeader}>
      <View style={[infoStyles.iconBadge, { backgroundColor: color + "18" }]}>
        <Ionicons name="time" size={16} color={color} />
      </View>
      <Text style={infoStyles.cardTitle}>Historial Reciente</Text>
    </View>
    {HISTORY_DATA[vital].map((item, i) => (
      <View
        key={i}
        style={[
          infoStyles.historyRow,
          i < HISTORY_DATA[vital].length - 1 && infoStyles.historyBorder,
        ]}
      >
        <Text style={infoStyles.historyTime}>{item.time}</Text>
        <Text style={[infoStyles.historyValue, { color }]}>
          {item.value}
        </Text>
      </View>
    ))}
  </View>
);

// ─── Home Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [activeVital, setActiveVital] = useState<VitalType>("heart");
  const vitalConfig = VITALS.find((v) => v.key === activeVital)!;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.babyName}>Panel de Salud</Text>
            <Text style={styles.appTitle}>Oliver 👶🏻</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={24} color={TC.textDark} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
        </View>

        {/* ── Dashboard Card (ring + inline stats) ── */}
        <View style={styles.mainCardContainer}>
          <DashboardCard
            activeVital={activeVital}
            onVitalChange={setActiveVital}
          />
        </View>

        {/* ── Info Cards ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Detalles de {vitalConfig.label}
          </Text>
        </View>

        {/* 24h Trend — full width */}
        <TrendCard vital={activeVital} color={vitalConfig.color} />

        {/* History — full width */}
        <HistoryCard vital={activeVital} color={vitalConfig.color} />

        {/* ── Sleep summary ── */}
        <TouchableOpacity style={styles.sleepCard} activeOpacity={0.7}>
          <View style={styles.sleepIcon}>
            <Ionicons name="moon" size={24} color={TC.vitalOxygen} />
          </View>
          <View style={styles.sleepText}>
            <Text style={styles.sleepTitle}>Última Sesión de Sueño</Text>
            <Text style={styles.sleepSub}>2h 45m • Sueño Profundo</Text>
          </View>
          <View style={styles.chevronBox}>
            <Ionicons name="chevron-forward" size={18} color={TC.textMuted} />
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 56, // Ajustado para verse mejor considerando contentInsetAdjustmentBehavior
    paddingBottom: 120,
    gap: 20,
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  babyName: {
    fontSize: 13,
    fontWeight: "700",
    color: TC.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.8,
  },
  notifBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: TC.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  notifBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TC.vitalTemp,
    borderWidth: 2,
    borderColor: TC.card,
  },

  mainCardContainer: {
    marginVertical: 8,
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
