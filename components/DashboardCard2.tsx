import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  value: string;
  label: string;
}

interface DashboardCardProps {
  current?: number;
  goal?: number;
  totalHours?: number;
  totalEarned?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PINK = "#C8185A";
const PINK_LIGHT = "#E8407A";
const GRAY_TRACK = "#F0F0F5";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#1E1E28";
const TEXT_MUTED = "#8E8E9E";

// ─── ArcProgress ─────────────────────────────────────────────────────────────

const ArcProgress: React.FC<{ current: number; goal: number }> = ({
  current,
  goal,
}) => {
  const SIZE = 240;
  const STROKE = 16;
  const GAP_DEG = 12; // Gap amplio para prevenir solapamiento de round caps
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const CENTER = SIZE / 2;

  const progress = Math.min(current / goal, 1);
  const SEGMENT_DEG = (360 - 4 * GAP_DEG) / 4;
  const progressDeg = progress * (360 - 4 * GAP_DEG);

  type Segment = { start: number; filled: number };

  const segments: Segment[] = Array.from({ length: 4 }, (_, i) => {
    const segStart = i * (SEGMENT_DEG + GAP_DEG);
    const filled = Math.max(0, Math.min(progressDeg - i * SEGMENT_DEG, SEGMENT_DEG));
    return { start: segStart, filled };
  });

  const renderArc = (
    startDeg: number,
    lengthDeg: number,
    color: string,
    key: string,
    isBackground: boolean = false
  ) => {
    // Evitar renderizar el dot redondo si el progreso es minúsculo
    if (lengthDeg <= 1) return null;

    const fraction = lengthDeg / 360;
    const dasharray = `${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    const rotation = -90 + startDeg;

    return (
      <Circle
        key={key}
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={isBackground ? STROKE : STROKE}
        strokeLinecap="round"
        strokeDasharray={dasharray}
        strokeDashoffset={0}
        rotation={rotation}
        origin={`${CENTER}, ${CENTER}`}
      />
    );
  };

  return (
    <View style={styles.arcContainer}>
      <Svg width={SIZE} height={SIZE}>
        {/* Grises */}
        {segments.map((seg, i) =>
          renderArc(seg.start, SEGMENT_DEG, GRAY_TRACK, `track-${i}`, true)
        )}
        {/* Rosas */}
        {segments.map((seg, i) =>
          renderArc(seg.start, seg.filled, PINK, `fill-${i}`, false)
        )}
      </Svg>

      {/* Centro */}
      <View style={styles.arcCenter}>
        <Text style={styles.arcValue}>{goal}</Text>
        <Text style={styles.arcLabel}>Hours Goal</Text>
      </View>
    </View>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => (
  <View style={styles.statCard}>
    <View style={styles.statIconWrapper}>
      <Text style={styles.statIcon}>{icon}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── DashboardCard (main export) ─────────────────────────────────────────────

const DashboardCard: React.FC<DashboardCardProps> = ({
  current = 45,
  goal = 160,
  totalHours = 45,
  totalEarned = "1.7k",
}) => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Monthly Progress</Text>
      </View>

      {/* Arc Progress */}
      <ArcProgress current={current} goal={goal} />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          icon="⏳"
          value={String(totalHours)}
          label="Total Hours"
        />
        <View style={styles.statDivider} />
        <StatCard
          icon="💵"
          value={`$${totalEarned}`}
          label="Total Earned"
        />
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 40,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    borderCurve: "continuous" as any,
    borderWidth: 1,
    borderColor: "#F5F5F8",
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // ── Arc ──
  arcContainer: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  arcCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  arcValue: {
    fontSize: 64,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -2,
    lineHeight: 72,
  },
  arcLabel: {
    fontSize: 12,
    color: PINK,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    backgroundColor: PINK + "15",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 0,
    borderCurve: "continuous" as any,
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: GRAY_TRACK,
    marginVertical: 28,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  statDivider: {
    width: 1,
    height: 56,
    backgroundColor: GRAY_TRACK,
    marginHorizontal: 20,
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: PINK + "10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderCurve: "continuous" as any,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
});

export default DashboardCard;
