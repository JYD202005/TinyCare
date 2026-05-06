import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { TC } from "./theme";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VitalType = "heart" | "oxygen" | "temp" | "activity";

export interface VitalConfig {
  key: VitalType;
  label: string;
  value: string;
  unit: string;
  color: string;
  colorDim: string;
  icon: keyof typeof Ionicons.glyphMap;
  progress: number;
}

export interface DashboardCardProps {
  activeVital?: VitalType;
  onVitalChange?: (vital: VitalType) => void;
  liveData?: VitalConfig[];
  averages?: any;
  alertsCount?: number;
}

// ─── Value Generators ────────────────────────────────────────────────────────

const randomInRange = (min: number, max: number, decimals = 0): number => {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
};

const ACTIVITY_LABELS = ["Calmo", "Activo", "Dormido", "Jugando", "Inquieto"];

const getEmptyVitals = (): VitalConfig[] => {
  return [
    {
      key: "heart",
      label: "Ritmo Cardíaco",
      value: "---",
      unit: "LPM",
      color: TC.vitalHeart,
      colorDim: TC.vitalHeart + "30",
      icon: "heart",
      progress: 0,
    },
    {
      key: "oxygen",
      label: "Oxigenación",
      value: "---",
      unit: "%",
      color: TC.vitalOxygen,
      colorDim: TC.vitalOxygen + "30",
      icon: "water",
      progress: 0,
    },
    {
      key: "temp",
      label: "Temperatura",
      value: "---",
      unit: "°C",
      color: TC.vitalTemp,
      colorDim: TC.vitalTemp + "30",
      icon: "thermometer",
      progress: 0,
    },
    {
      key: "activity",
      label: "Actividad",
      value: "Sin Datos",
      unit: "",
      color: TC.vitalActivity,
      colorDim: TC.vitalActivity + "30",
      icon: "fitness",
      progress: 0,
    },
  ];
};

// Re-export a static copy for other screens that import VITALS
export const VITALS: VitalConfig[] = [
  {
    key: "heart",
    label: "Ritmo Cardíaco",
    value: "92",
    unit: "LPM",
    color: TC.vitalHeart,
    colorDim: TC.vitalHeart + "30",
    icon: "heart",
    progress: 0.78,
  },
  {
    key: "oxygen",
    label: "Oxigenación",
    value: "98",
    unit: "%",
    color: TC.vitalOxygen,
    colorDim: TC.vitalOxygen + "30",
    icon: "water",
    progress: 0.95,
  },
  {
    key: "temp",
    label: "Temperatura",
    value: "36.5",
    unit: "°C",
    color: TC.vitalTemp,
    colorDim: TC.vitalTemp + "30",
    icon: "thermometer",
    progress: 0.68,
  },
  {
    key: "activity",
    label: "Actividad",
    value: "Calmo",
    unit: "",
    color: TC.vitalActivity,
    colorDim: TC.vitalActivity + "30",
    icon: "fitness",
    progress: 0.35,
  },
];

// ─── Animated Circle ─────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Ring Constants ──────────────────────────────────────────────────────────

const SIZE = 220;
const STROKE = 12;
const GAP_DEG = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;
const SEGMENT_DEG = (360 - 4 * GAP_DEG) / 4;

const CONTAINER_SIZE = SIZE + 72;
const CONTAINER_CENTER = CONTAINER_SIZE / 2;

// ─── Icon Positions ──────────────────────────────────────────────────────────

const getIconPosition = (index: number) => {
  const angleDeg = index * (SEGMENT_DEG + GAP_DEG) + SEGMENT_DEG / 2 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const iconRadius = RADIUS + 28;
  return {
    x: CONTAINER_CENTER + iconRadius * Math.cos(angleRad),
    y: CONTAINER_CENTER + iconRadius * Math.sin(angleRad),
  };
};

// ─── AnimatedSegment ─────────────────────────────────────────────────────────

const AnimatedSegment: React.FC<{
  vital: VitalConfig;
  index: number;
  isActive: boolean;
}> = ({ vital, index, isActive }) => {
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: vital.progress,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [vital.progress]);

  const startDeg = index * (SEGMENT_DEG + GAP_DEG);
  const rotation = -90 + startDeg;

  // Track
  const trackFraction = SEGMENT_DEG / 360;
  const trackDash = `${trackFraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`;

  // Animated fill dasharray
  const fillDash = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      `0 ${CIRCUMFERENCE}`,
      `${(SEGMENT_DEG / 360) * CIRCUMFERENCE} ${CIRCUMFERENCE}`,
    ],
  });

  return (
    <G>
      {/* Track background */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke={isActive ? vital.colorDim : TC.trackBg}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={trackDash}
        strokeDashoffset={0}
        rotation={rotation}
        origin={`${CENTER}, ${CENTER}`}
      />
      {/* Animated progress fill */}
      <AnimatedCircle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke={isActive ? vital.color : vital.colorDim}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={fillDash}
        strokeDashoffset={0}
        rotation={rotation}
        origin={`${CENTER}, ${CENTER}`}
      />
    </G>
  );
};

// ─── VitalRing Component ─────────────────────────────────────────────────────

const VitalRing: React.FC<{
  vitals: VitalConfig[];
  activeIndex: number;
  onPress: (index: number) => void;
}> = ({ vitals, activeIndex, onPress }) => {
  // Icon scale animations
  const iconScales = useRef(vitals.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    iconScales.forEach((scale, i) => {
      Animated.spring(scale, {
        toValue: i === activeIndex ? 1.25 : 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    });
  }, [activeIndex]);

  // Pulse animation for the active center icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Center value fade
  const centerOpacity = useRef(new Animated.Value(1)).current;
  const centerSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade out, slide, fade in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(centerOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(centerSlide, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(centerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(centerSlide, {
          toValue: 0,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [activeIndex, vitals[activeIndex]?.value]);

  const active = vitals[activeIndex] || vitals[0];

  return (
    <View style={ringStyles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          ringStyles.glowRing,
          {
            borderColor: active.color + "15",
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      <Svg width={SIZE} height={SIZE} style={ringStyles.svgBase}>
        {vitals.map((v, i) => (
          <AnimatedSegment
            key={v.key}
            vital={v}
            index={i}
            isActive={i === activeIndex}
          />
        ))}
      </Svg>

      {/* Icon buttons */}
      {vitals.map((vital, index) => {
        const pos = getIconPosition(index);
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={vital.key}
            activeOpacity={0.7}
            onPress={() => onPress(index)}
            style={[
              ringStyles.iconTouch,
              {
                left: pos.x - 24,
                top: pos.y - 24,
              },
            ]}
          >
            <Animated.View
              style={[
                ringStyles.iconCircle,
                {
                  backgroundColor: isActive ? vital.color : TC.card,
                  borderWidth: isActive ? 0 : 1.5,
                  borderColor: isActive ? "transparent" : TC.inputBorder,
                  transform: [{ scale: iconScales[index] }],
                  ...(isActive
                    ? {
                        ...ringStyles.activeShadow,
                        shadowColor: vital.color,
                      }
                    : ringStyles.inactiveShadow),
                },
              ]}
            >
              <Ionicons
                name={vital.icon}
                size={isActive ? 20 : 17}
                color={isActive ? "#FFF" : vital.color}
              />
            </Animated.View>
          </TouchableOpacity>
        );
      })}

      {/* Central metric */}
      <Animated.View
        style={[
          ringStyles.center,
          {
            opacity: centerOpacity,
            transform: [{ translateY: centerSlide }, { scale: pulseAnim }],
          },
        ]}
      >
        <Ionicons
          name={active.icon}
          size={28}
          color={active.color}
          style={{ marginBottom: 2 }}
        />
        <Text style={[ringStyles.value, { color: active.color }]}>
          {active.value}
        </Text>
        {active.unit ? (
          <Text style={ringStyles.unit}>{active.unit}</Text>
        ) : null}
        <View style={[ringStyles.labelBadge, { backgroundColor: active.color + "12" }]}>
          <Text style={[ringStyles.label, { color: active.color }]}>
            {active.label}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const ringStyles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  glowRing: {
    position: "absolute",
    width: SIZE + 32,
    height: SIZE + 32,
    borderRadius: (SIZE + 32) / 2,
    borderWidth: 2,
  },
  svgBase: {
    position: "absolute",
  },
  iconTouch: {
    position: "absolute",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  activeShadow: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  inactiveShadow: {
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 48,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -1.5,
    lineHeight: 54,
  },
  unit: {
    fontSize: 15,
    fontWeight: "700",
    color: TC.textMuted,
    marginTop: -4,
    letterSpacing: 0.5,
  },
  labelBadge: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderCurve: "continuous" as any,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

// ─── DashboardCard (Main Export) ─────────────────────────────────────────────

const DashboardCard: React.FC<DashboardCardProps> = ({
  activeVital = "heart",
  onVitalChange,
  liveData,
  averages,
  alertsCount = 0,
}) => {
  const [liveVitals, setLiveVitals] = useState<VitalConfig[]>(liveData || getEmptyVitals());

  useEffect(() => {
    if (liveData) {
      setLiveVitals(liveData);
    } else {
      setLiveVitals(getEmptyVitals());
    }
  }, [liveData]);

  const activeIndex = liveVitals.findIndex((v) => v.key === activeVital);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const vital = liveVitals[safeIndex];

  // Card entrance animation
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Status chip animation on vital change
  const chipScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(chipScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(chipScale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeVital]);

  const getStatusText = useCallback((v: VitalConfig): string => {
    if (v.key === "activity") return "Actividad Saludable";
    if (v.key === "heart") {
      const hr = parseInt(v.value);
      if (hr > 100) return "Frecuencia Elevada";
      if (hr < 75) return "Frecuencia Baja";
      return "En Rango Saludable";
    }
    if (v.key === "oxygen") {
      const o2 = parseInt(v.value);
      if (o2 >= 98) return "Oxigenación Excelente";
      if (o2 < 96) return "Oxigenación Baja";
      return "En Rango Saludable";
    }
    if (v.key === "temp") {
      const t = parseFloat(v.value);
      if (t > 37.0) return "Temperatura Elevada";
      return "Temperatura Estable";
    }
    return "En Rango Saludable";
  }, []);

  // Stat data for the inline row
  const getAvgValue = useCallback((v: VitalConfig): string => {
    if (!averages) return "---";
    if (v.key === "heart") return averages.hr ? String(averages.hr) : "---";
    if (v.key === "oxygen") return averages.spo2 ? String(averages.spo2) : "---";
    if (v.key === "temp") return averages.temp ? String(averages.temp) : "---";
    return "Media";
  }, [averages]);

  const getAvgLabel = useCallback((v: VitalConfig): string => {
    if (v.key === "heart") return "Promedio";
    if (v.key === "oxygen") return "Promedio";
    if (v.key === "temp") return "Promedio";
    return "Nivel";
  }, []);

  // Stats row entrance animation
  const statsSlide = useRef(new Animated.Value(20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Reset and animate on vital change
    statsSlide.setValue(16);
    statsOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(statsSlide, {
        toValue: 0,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(statsOpacity, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeVital]);

  return (
    <Animated.View
      style={[
        cardStyles.card,
        {
          transform: [{ scale: cardScale }],
          opacity: cardOpacity,
        },
      ]}
    >
      {/* Live indicator */}
      <View style={cardStyles.liveRow}>
        <View style={cardStyles.liveDot} />
        <Text style={cardStyles.liveText}>EN VIVO</Text>
      </View>

      <VitalRing
        vitals={liveVitals}
        activeIndex={safeIndex}
        onPress={(i) => onVitalChange?.(liveVitals[i].key)}
      />

      {/* Status chip */}
      <Animated.View
        style={[
          cardStyles.statusChip,
          {
            backgroundColor: vital.color + "12",
            transform: [{ scale: chipScale }],
          },
        ]}
      >
        <View
          style={[cardStyles.statusDot, { backgroundColor: vital.color }]}
        />
        <Text style={[cardStyles.statusText, { color: vital.color }]}>
          {getStatusText(vital)}
        </Text>
      </Animated.View>

      {/* ── Inline Stats Row ── */}
      <View style={cardStyles.divider} />
      <Animated.View
        style={[
          cardStyles.statsRow,
          {
            opacity: statsOpacity,
            transform: [{ translateY: statsSlide }],
          },
        ]}
      >
        {/* Stat: Promedio */}
        <View style={cardStyles.statItem}>
          <View style={[cardStyles.statIcon, { backgroundColor: vital.color + "12" }]}>
            <Ionicons name="analytics" size={18} color={vital.color} />
          </View>
          <View>
            <Text style={cardStyles.statValue}>
              {getAvgValue(vital)}
              {vital.unit ? (
                <Text style={cardStyles.statUnit}> {vital.unit}</Text>
              ) : null}
            </Text>
            <Text style={cardStyles.statLabel}>{getAvgLabel(vital)}</Text>
          </View>
        </View>

        {/* Vertical separator */}
        <View style={cardStyles.statSeparator} />

        {/* Stat: Alertas */}
        <View style={cardStyles.statItem}>
          <View style={[cardStyles.statIcon, { backgroundColor: TC.vitalHeart + "12" }]}>
            <Ionicons name="shield-checkmark" size={18} color={TC.vitalHeart} />
          </View>
          <View>
            <Text style={cardStyles.statValue}>{alertsCount}</Text>
            <Text style={cardStyles.statLabel}>Alertas Hoy</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: TC.card,
    borderRadius: 36,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    borderCurve: "continuous" as any,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    width: "100%",
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 8,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginLeft: 12,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    color: TC.textMuted,
    letterSpacing: 1.2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginTop: 8,
    borderCurve: "continuous" as any,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  /* ── Inline Stats ── */
  divider: {
    width: "85%",
    height: 1,
    backgroundColor: TC.inputBorder,
    marginTop: 20,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    paddingHorizontal: 8,
    gap: 0,
    width: "100%",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous" as any,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: TC.textDark,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  statUnit: {
    fontSize: 13,
    fontWeight: "600",
    color: TC.textMuted,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TC.textMuted,
    marginTop: 1,
  },
  statSeparator: {
    width: 1,
    height: 36,
    backgroundColor: TC.inputBorder,
    marginHorizontal: 4,
  },
});

export default DashboardCard;
