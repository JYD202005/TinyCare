import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
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

// ─── Responsive Ring Geometry Helper ──────────────────────────────────────────

export function getRingGeometry(windowWidth: number) {
  // 360px Android (Samsung, Xiaomi) & 380px iPhone
  const isCompact = windowWidth <= 385;
  const isTablet = windowWidth > 500;
  const size = isCompact ? 180 : isTablet ? 220 : 200;
  const stroke = isCompact ? 10 : 12;
  const gapDeg = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const segmentDeg = (360 - 4 * gapDeg) / 4;
  const containerSize = size + (isCompact ? 56 : 68);
  const containerCenter = containerSize / 2;
  const iconRadius = radius + (isCompact ? 22 : 26);
  const iconButtonSize = isCompact ? 36 : 42;
  const iconSize = isCompact ? 16 : 19;

  return {
    isCompact,
    size,
    stroke,
    gapDeg,
    radius,
    circumference,
    center,
    segmentDeg,
    containerSize,
    containerCenter,
    iconRadius,
    iconButtonSize,
    iconSize,
  };
}

// ─── AnimatedSegment ─────────────────────────────────────────────────────────

const AnimatedSegment: React.FC<{
  vital: VitalConfig;
  index: number;
  isActive: boolean;
  geom: ReturnType<typeof getRingGeometry>;
}> = ({ vital, index, isActive, geom }) => {
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: vital.progress,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [vital.progress]);

  const startDeg = index * (geom.segmentDeg + geom.gapDeg);
  const rotation = -90 + startDeg;

  // Track
  const trackFraction = geom.segmentDeg / 360;
  const trackDash = `${trackFraction * geom.circumference} ${geom.circumference}`;

  // Animated fill dasharray
  const fillDash = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      `0 ${geom.circumference}`,
      `${(geom.segmentDeg / 360) * geom.circumference} ${geom.circumference}`,
    ],
  });

  return (
    <G>
      {/* Track background */}
      <Circle
        cx={geom.center}
        cy={geom.center}
        r={geom.radius}
        fill="none"
        stroke={isActive ? vital.colorDim : TC.trackBg}
        strokeWidth={geom.stroke}
        strokeLinecap="round"
        strokeDasharray={trackDash}
        strokeDashoffset={0}
        rotation={rotation}
        origin={`${geom.center}, ${geom.center}`}
      />
      {/* Animated progress fill */}
      <AnimatedCircle
        cx={geom.center}
        cy={geom.center}
        r={geom.radius}
        fill="none"
        stroke={isActive ? vital.color : vital.colorDim}
        strokeWidth={geom.stroke}
        strokeLinecap="round"
        strokeDasharray={fillDash}
        strokeDashoffset={0}
        rotation={rotation}
        origin={`${geom.center}, ${geom.center}`}
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
  const { width: windowWidth } = useWindowDimensions();
  const geom = getRingGeometry(windowWidth);

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
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Center value fade
  const centerOpacity = useRef(new Animated.Value(1)).current;
  const centerSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  const getIconPosition = (index: number) => {
    const angleDeg =
      index * (geom.segmentDeg + geom.gapDeg) + geom.segmentDeg / 2 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: geom.containerCenter + geom.iconRadius * Math.cos(angleRad),
      y: geom.containerCenter + geom.iconRadius * Math.sin(angleRad),
    };
  };

  return (
    <View
      style={[
        ringStyles.container,
        { width: geom.containerSize, height: geom.containerSize },
      ]}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={[
          ringStyles.glowRing,
          {
            width: geom.size + (geom.isCompact ? 22 : 30),
            height: geom.size + (geom.isCompact ? 22 : 30),
            borderRadius: (geom.size + (geom.isCompact ? 22 : 30)) / 2,
            borderColor: active.color + "15",
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      <Svg width={geom.size} height={geom.size} style={ringStyles.svgBase}>
        {vitals.map((v, i) => (
          <AnimatedSegment
            key={v.key}
            vital={v}
            index={i}
            isActive={i === activeIndex}
            geom={geom}
          />
        ))}
      </Svg>

      {/* Icon buttons */}
      {vitals.map((vital, index) => {
        const pos = getIconPosition(index);
        const isActive = index === activeIndex;
        const touchRadius = geom.iconButtonSize / 2 + 4;
        return (
          <TouchableOpacity
            key={vital.key}
            activeOpacity={0.7}
            onPress={() => onPress(index)}
            style={[
              ringStyles.iconTouch,
              {
                width: geom.iconButtonSize + 8,
                height: geom.iconButtonSize + 8,
                left: pos.x - touchRadius,
                top: pos.y - touchRadius,
              },
            ]}
          >
            <Animated.View
              style={[
                ringStyles.iconCircle,
                {
                  width: geom.iconButtonSize,
                  height: geom.iconButtonSize,
                  borderRadius: geom.iconButtonSize / 2,
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
                size={isActive ? geom.iconSize + 2 : geom.iconSize}
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
          size={geom.isCompact ? 22 : 28}
          color={active.color}
          style={{ marginBottom: 2 }}
        />
        <Text
          style={[
            ringStyles.value,
            {
              color: active.color,
              fontSize: geom.isCompact ? 36 : 46,
              lineHeight: geom.isCompact ? 40 : 52,
            },
          ]}
        >
          {active.value}
        </Text>
        {active.unit ? (
          <Text
            style={[
              ringStyles.unit,
              geom.isCompact && { fontSize: 13, marginTop: -2 },
            ]}
          >
            {active.unit}
          </Text>
        ) : null}
        <View
          style={[
            ringStyles.labelBadge,
            {
              backgroundColor: active.color + "12",
              marginTop: geom.isCompact ? 6 : 10,
              paddingHorizontal: geom.isCompact ? 10 : 14,
              paddingVertical: geom.isCompact ? 3 : 5,
            },
          ]}
        >
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
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  glowRing: {
    position: "absolute",
    borderWidth: 2,
  },
  svgBase: {
    position: "absolute",
  },
  iconTouch: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  iconCircle: {
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
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -1.5,
  },
  unit: {
    fontSize: 15,
    fontWeight: "700",
    color: TC.textMuted,
    marginTop: -4,
    letterSpacing: 0.5,
  },
  labelBadge: {
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
  const [liveVitals, setLiveVitals] = useState<VitalConfig[]>(
    liveData || getEmptyVitals(),
  );

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
  const getAvgValue = useCallback(
    (v: VitalConfig): string => {
      if (!averages) return "---";
      if (v.key === "heart") return averages.hr ? String(averages.hr) : "---";
      if (v.key === "oxygen")
        return averages.spo2 ? String(averages.spo2) : "---";
      if (v.key === "temp")
        return averages.temp ? String(averages.temp) : "---";
      return "Media";
    },
    [averages],
  );

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
          <View
            style={[
              cardStyles.statIcon,
              { backgroundColor: vital.color + "12" },
            ]}
          >
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
          <View
            style={[
              cardStyles.statIcon,
              { backgroundColor: TC.vitalHeart + "12" },
            ]}
          >
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
    borderRadius: 28,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderCurve: "continuous" as any,
    borderWidth: 1,
    borderColor: TC.accentLight,
    width: "100%",
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 6,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginLeft: 8,
    marginBottom: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: TC.accent,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: TC.textMuted,
    letterSpacing: 1.2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginTop: 6,
    borderCurve: "continuous" as any,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  /* ── Inline Stats ── */
  divider: {
    width: "90%",
    height: 1,
    backgroundColor: TC.accentLight,
    marginTop: 12,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingHorizontal: 4,
    gap: 0,
    width: "100%",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous" as any,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: TC.textDark,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: TC.textMuted,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: TC.textMuted,
    marginTop: 1,
  },
  statSeparator: {
    width: 1,
    height: 28,
    backgroundColor: TC.inputBorder,
    marginHorizontal: 2,
  },
});

export default DashboardCard;
