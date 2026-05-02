import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { TC } from "../../components/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const IS_SMALL = SCREEN_W < 380;
const PADDING_H = IS_SMALL ? 16 : 24;
const CARD_GAP = IS_SMALL ? 12 : 16;
const CARD_PADDING = IS_SMALL ? 12 : 16;
const POPUP_PADDING = IS_SMALL ? 20 : 24;

const MINI_CARD_W = (SCREEN_W - (PADDING_H * 2) - CARD_GAP) / 2;
const MINI_CHART_W = MINI_CARD_W - (CARD_PADDING * 2); 

const TrendChart = ({ data, color, height = 80, width, showDots = true }: { data: number[], color: string, height?: number, width: number, showDots?: boolean }) => {
  const min = Math.min(...data) - (Math.max(...data) - Math.min(...data)) * 0.2;
  const max = Math.max(...data) + (Math.max(...data) - Math.min(...data)) * 0.2;
  const range = max - min || 1;
  
  const paddingX = showDots ? 8 : 4;
  const paddingY = showDots ? 8 : 4;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const stepX = innerWidth / Math.max(data.length - 1, 1);

  const pathData = data.map((val, i) => {
    const x = paddingX + i * stepX;
    const y = paddingY + innerHeight - ((val - min) / range) * innerHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(" ");

  const fillPath = `${pathData} L ${paddingX + innerWidth} ${height} L ${paddingX} ${height} Z`;

  return (
    <View style={{ height, width }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.2" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill={`url(#grad-${color})`} />
        <Path 
          d={pathData} 
          stroke={color} 
          strokeWidth="3" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {showDots && data.map((val, i) => (
          <Circle 
            key={i} 
            cx={paddingX + i * stepX} 
            cy={paddingY + innerHeight - ((val - min) / range) * innerHeight} 
            r="4" 
            fill="#FFF" 
            stroke={color} 
            strokeWidth={2} 
          />
        ))}
      </Svg>
    </View>
  );
};

const MetricMiniCard = ({ metric, period, onPress }: any) => {
  const data = period === "24H" ? metric.data24H : metric.data7D;
  const isNormal = metric.status === 'Normal';

  return (
    <TouchableOpacity 
      style={[s.miniCard, { width: MINI_CARD_W, padding: CARD_PADDING, paddingBottom: CARD_PADDING - 4 }]} 
      onPress={() => onPress(metric)}
      activeOpacity={0.7}
    >
      <View style={s.miniHeader}>
        <View style={[s.iconBoxSmall, { backgroundColor: metric.color + "15" }]}>
          <Ionicons name={metric.icon} size={16} color={metric.color} />
        </View>
        <View style={[s.statusDot, { backgroundColor: isNormal ? '#10B981' : '#EF4444' }]} />
      </View>
      
      <View style={s.miniBody}>
        <Text style={s.miniTitle} numberOfLines={1}>{metric.title}</Text>
        <View style={s.miniValueRow}>
          <Text style={[s.miniValue, { color: metric.color }]} numberOfLines={1} adjustsFontSizeToFit>{metric.value}</Text>
          <Text style={s.miniUnit}>{metric.unit}</Text>
        </View>
      </View>

      <TrendChart data={data} color={metric.color} height={36} width={MINI_CHART_W} showDots={false} />
    </TouchableOpacity>
  );
};

const ExpandedMetricModal = ({ metric, period, visible, onClose }: any) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!metric) return null;

  const data = period === "24H" ? metric.data24H : metric.data7D;
  const isNormal = metric.status === 'Normal';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.modalOverlayCenter}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <Animated.View style={[s.modalPopup, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={s.sheetHeader}>
            <View style={s.sheetHeaderLeft}>
              <View style={[s.iconBox, { backgroundColor: metric.color + "15" }]}>
                <Ionicons name={metric.icon} size={24} color={metric.color} />
              </View>
              <View>
                <Text style={s.sheetTitle}>{metric.fullName}</Text>
                <Text style={s.sheetSubtitle}>{metric.subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={s.sheetStatusRow}>
             <View style={[s.statusBadge, { backgroundColor: isNormal ? '#ECFDF5' : '#FEF2F2' }]}>
               <Text style={[s.statusText, { color: isNormal ? '#059669' : '#DC2626' }]}>
                 ESTADO: {metric.status.toUpperCase()}
               </Text>
             </View>
          </View>
          
          <View style={s.sheetValueRow}>
            <Text style={[s.sheetMainValue, { color: metric.color }]} numberOfLines={1} adjustsFontSizeToFit>{metric.value}</Text>
            <Text style={s.sheetUnit}>{metric.unit}</Text>
          </View>

          <View style={s.modalChartContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalChartScrollContent}>
              <TrendChart data={data} color={metric.color} height={120} width={Math.max(SCREEN_W - (POPUP_PADDING * 2), data.length * 60)} showDots={true} />
            </ScrollView>
          </View>

          <View style={s.insightsGrid}>
            {metric.insights.map((ins: any, idx: number) => (
              <View key={idx} style={s.insightBox}>
                <Text style={s.insightLabel}>{ins.label}</Text>
                <Text style={s.insightValue}>{ins.value}</Text>
              </View>
            ))}
          </View>

          <View style={s.divider} />

          <View style={s.infoBox}>
            <Ionicons name="information-circle" size={20} color={metric.color} />
            <Text style={s.infoBoxText}>{metric.info}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const DUMMY_SPO2 = [96, 97, 98, 97, 98, 99, 98];
const DUMMY_TEMP = [36.5, 36.5, 36.6, 36.4, 36.7, 36.5, 36.6];
const DUMMY_HR = [110, 115, 118, 114, 112, 109, 111];
const DUMMY_POSTURE = [80, 85, 70, 90, 85, 75, 80];

const METRICS = [
  {
    id: 'spo2',
    title: "SpO₂",
    fullName: "Oximetría (SpO₂)",
    subtitle: "Saturación de Oxígeno",
    icon: "water",
    value: "98",
    unit: "%",
    status: "Normal",
    data24H: DUMMY_SPO2,
    data7D: DUMMY_SPO2.map(v => +(v - 0.5).toFixed(1)),
    color: TC.vitalOxygen,
    info: "Los niveles promedio se mantienen en el percentil seguro (>95%). No se detectaron episodios de hipoxia.",
    insights: [
      { label: "Promedio", value: "97%" },
      { label: "Mínimo", value: "95%" },
    ]
  },
  {
    id: 'hr',
    title: "Pulso",
    fullName: "Frecuencia Cardíaca",
    subtitle: "Pulso en Reposo",
    icon: "heart",
    value: "112",
    unit: "BPM",
    status: "Normal",
    data24H: DUMMY_HR,
    data7D: DUMMY_HR.map(v => v + 2),
    color: TC.vitalHeart,
    info: "Ritmo cardíaco consistente con la fase de sueño REM. Sin arritmias detectadas.",
    insights: [
      { label: "Promedio", value: "114" },
      { label: "Mínimo", value: "105" },
    ]
  },
  {
    id: 'temp',
    title: "Temp",
    fullName: "Termometría Infrarroja",
    subtitle: "Temperatura Superficial",
    icon: "thermometer",
    value: "36.6",
    unit: "°C",
    status: "Normal",
    data24H: DUMMY_TEMP,
    data7D: DUMMY_TEMP.map(v => +(v + 0.1).toFixed(1)),
    color: TC.vitalTemp,
    info: "Curva térmica estable. Variación circadiana dentro de los límites clínicos esperados.",
    insights: [
      { label: "Promedio", value: "36.5" },
      { label: "Máximo", value: "36.8" },
    ]
  },
  {
    id: 'posture',
    title: "Postura",
    fullName: "Higiene Postural",
    subtitle: "Tiempo en Decúbito",
    icon: "body",
    value: "85",
    unit: "%",
    status: "Normal",
    data24H: DUMMY_POSTURE,
    data7D: DUMMY_POSTURE.map(v => v - 3),
    color: TC.vitalActivity,
    info: "Postura segura mantenida durante la mayor parte del ciclo de sueño. Riesgo de asfixia posicional mínimo.",
    insights: [
      { label: "Boca arriba", value: "85%" },
      { label: "De lado", value: "15%" },
    ]
  }
];

export default function StatsScreen() {
  const [period, setPeriod] = useState<"24H" | "7D">("24H");
  const [selectedMetric, setSelectedMetric] = useState<any>(null);

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={s.header}>
          <Text style={s.headerKicker}>EXPEDIENTE TELEMÉTRICO</Text>
          <Text style={s.headerTitle}>Análisis Clínico</Text>
        </View>

        <View style={s.toggleRow}>
          <TouchableOpacity 
            style={[s.toggleBtn, period === "24H" && s.toggleBtnActive]} 
            onPress={() => setPeriod("24H")}
            activeOpacity={0.7}
          >
            <Text style={[s.toggleText, period === "24H" && s.toggleTextActive]}>Últimas 24H</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.toggleBtn, period === "7D" && s.toggleBtnActive]} 
            onPress={() => setPeriod("7D")}
            activeOpacity={0.7}
          >
            <Text style={[s.toggleText, period === "7D" && s.toggleTextActive]}>Últimos 7 Días</Text>
          </TouchableOpacity>
        </View>

        <View style={s.metricsGrid}>
          {METRICS.map(m => (
            <MetricMiniCard 
              key={m.id} 
              metric={m} 
              period={period} 
              onPress={setSelectedMetric} 
            />
          ))}
        </View>

        <View style={s.alertCard}>
          <Ionicons name="shield-checkmark" size={24} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>Telemetría Estable</Text>
            <Text style={s.alertDesc}>
              Todos los biomarcadores se encuentran dentro de los parámetros pediátricos seguros.
            </Text>
          </View>
        </View>

      </ScrollView>

      <ExpandedMetricModal 
        metric={selectedMetric}
        period={period}
        visible={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingHorizontal: PADDING_H, paddingTop: IS_SMALL ? 40 : 60, paddingBottom: 120, gap: IS_SMALL ? 16 : 20 },
  
  header: { marginBottom: 8 },
  headerKicker: { fontSize: 11, fontWeight: '800', color: TC.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  headerTitle: { fontSize: IS_SMALL ? 28 : 32, fontWeight: '700', color: TC.textDark, letterSpacing: -1 },

  toggleRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#FFF', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' } as any,
  toggleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  toggleTextActive: { color: TC.textDark },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 8 },

  miniCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderCurve: 'continuous' as any,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: '#F8FAFC',
  } as any,
  miniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  iconBoxSmall: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  
  miniBody: { marginBottom: 4 },
  miniTitle: { fontSize: IS_SMALL ? 12 : 13, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  miniValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, flexShrink: 1 },
  miniValue: { fontSize: IS_SMALL ? 24 : 28, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'], flexShrink: 1 },
  miniUnit: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },

  alertCard: {
    flexDirection: 'row', backgroundColor: '#ECFDF5', borderRadius: 20, padding: IS_SMALL ? 16 : 20, gap: 16,
    borderWidth: 1, borderColor: '#D1FAE5', alignItems: 'center',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.05)',
  } as any,
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#065F46', marginBottom: 4 },
  alertDesc: { fontSize: 13, fontWeight: '400', color: '#047857', lineHeight: 20 },

  // Modal styles
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: IS_SMALL ? 16 : 20 },
  modalPopup: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: POPUP_PADDING,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  } as any,
  
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: TC.textDark, letterSpacing: -0.5 },
  sheetSubtitle: { fontSize: 14, fontWeight: '500', color: '#94A3B8' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },

  sheetStatusRow: { marginBottom: 24 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  sheetValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexShrink: 1 },
  sheetMainValue: { fontSize: IS_SMALL ? 40 : 48, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'], flexShrink: 1 },
  sheetUnit: { fontSize: 20, fontWeight: '600', color: '#64748B' },

  modalChartContainer: { marginVertical: 16, marginHorizontal: -POPUP_PADDING },
  modalChartScrollContent: { paddingHorizontal: POPUP_PADDING, paddingVertical: 8 },

  insightsGrid: { flexDirection: 'row', gap: IS_SMALL ? 8 : 12, marginBottom: IS_SMALL ? 16 : 24 },
  insightBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: IS_SMALL ? 12 : 16, borderWidth: 1, borderColor: '#F1F5F9' },
  insightLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 4 },
  insightValue: { fontSize: IS_SMALL ? 14 : 16, fontWeight: '700', color: TC.textDark },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 },
  
  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, alignItems: 'flex-start' },
  infoBoxText: { flex: 1, fontSize: 14, fontWeight: '400', color: '#475569', lineHeight: 22 },
});
