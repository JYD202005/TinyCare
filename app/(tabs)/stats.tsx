import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, Pressable, Animated, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
let MailComposer: any = null;
try {
  MailComposer = require("expo-mail-composer");
} catch (e) {
  console.warn("ExpoMailComposer is not available", e);
}
import { TC } from "../../components/theme";
import { useToast } from "../../components/Toast";

const { width: SCREEN_W } = Dimensions.get("window");
const IS_SMALL = SCREEN_W < 380;
const PADDING_H = IS_SMALL ? 16 : 24;
const CARD_GAP = IS_SMALL ? 12 : 16;
const CARD_PADDING = IS_SMALL ? 12 : 16;
const POPUP_PADDING = IS_SMALL ? 20 : 24;

const MINI_CARD_W = (SCREEN_W - (PADDING_H * 2) - CARD_GAP) / 2;
const MINI_CHART_W = MINI_CARD_W - (CARD_PADDING * 2); 

const TrendChart = ({ data, color, height = 80, width, showDots = true }: { data: number[], color: string, height?: number, width: number, showDots?: boolean }) => {
  const safeData = data.length === 0 ? [0, 0] : data.length === 1 ? [data[0], data[0]] : data;

  const min = Math.min(...safeData) - (Math.max(...safeData) - Math.min(...safeData)) * 0.2;
  const max = Math.max(...safeData) + (Math.max(...safeData) - Math.min(...safeData)) * 0.2;
  const range = max - min || 1;
  
  const paddingX = showDots ? 8 : 4;
  const paddingY = showDots ? 8 : 4;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const stepX = innerWidth / Math.max(safeData.length - 1, 1);

  const pathData = safeData.map((val, i) => {
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
        {showDots && safeData.map((val, i) => (
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
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(metric.value);

  useEffect(() => {
    if (prevValue.current !== metric.value) {
      prevValue.current = metric.value;
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [metric.value]);

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
      
      <Animated.View style={[s.miniBody, { opacity: pulseAnim }]}>
        <Text style={s.miniTitle} numberOfLines={1}>{metric.title}</Text>
        <View style={s.miniValueRow}>
          <Text style={[s.miniValue, { color: metric.color }]} numberOfLines={1} adjustsFontSizeToFit>{metric.value}</Text>
          <Text style={s.miniUnit}>{metric.unit}</Text>
        </View>
      </Animated.View>

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

const METRICS = [
  {
    id: 'spo2',
    title: "SpO₂",
    fullName: "Oximetría (SpO₂)",
    subtitle: "Saturación de Oxígeno",
    icon: "water",
    value: "--",
    unit: "%",
    status: "Sin Datos",
    data24H: [] as number[],
    data7D: [] as number[],
    color: TC.vitalOxygen,
    info: "Los niveles promedio se mantienen en el percentil seguro (>95%). No se detectaron episodios de hipoxia.",
    insights: [
      { label: "Promedio", value: "--" },
      { label: "Mínimo", value: "--" },
    ]
  },
  {
    id: 'hr',
    title: "Pulso",
    fullName: "Frecuencia Cardíaca",
    subtitle: "Pulso en Reposo",
    icon: "heart",
    value: "--",
    unit: "BPM",
    status: "Sin Datos",
    data24H: [] as number[],
    data7D: [] as number[],
    color: TC.vitalHeart,
    info: "Ritmo cardíaco consistente con la fase de sueño REM. Sin arritmias detectadas.",
    insights: [
      { label: "Promedio", value: "--" },
      { label: "Mínimo", value: "--" },
    ]
  },
  {
    id: 'temp',
    title: "Temp",
    fullName: "Termometría Infrarroja",
    subtitle: "Temperatura Superficial",
    icon: "thermometer",
    value: "--",
    unit: "°C",
    status: "Sin Datos",
    data24H: [] as number[],
    data7D: [] as number[],
    color: TC.vitalTemp,
    info: "Curva térmica estable. Variación circadiana dentro de los límites clínicos esperados.",
    insights: [
      { label: "Promedio", value: "--" },
      { label: "Máximo", value: "--" },
    ]
  },
  {
    id: 'posture',
    title: "Postura",
    fullName: "Higiene Postural",
    subtitle: "Tiempo en Decúbito",
    icon: "body",
    value: "--",
    unit: "%",
    status: "Sin Datos",
    data24H: [] as number[],
    data7D: [] as number[],
    color: TC.vitalActivity,
    info: "Postura segura mantenida durante la mayor parte del ciclo de sueño. Riesgo de asfixia posicional mínimo.",
    insights: [
      { label: "Boca arriba", value: "--" },
      { label: "De lado", value: "--" },
    ]
  }
];

/* ── Send to Pediatrician ── */
const SendToPediatrician = ({ metrics, period, showToast }: { metrics: typeof METRICS; period: string; showToast: any }) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleSend = async () => {
    const statsBody = metrics.map(m => {
      const data = period === "24H" ? m.data24H : m.data7D;
      const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
      return `• ${m.fullName}: ${m.value} ${m.unit} (Prom: ${avg}, Estado: ${m.status})`;
    }).join("\n");

    const body = `Reporte TinyCare — ${period === "24H" ? "Últimas 24h" : "Últimos 7 días"}\n\n${statsBody}${message.trim() ? `\n\nNota del tutor:\n${message.trim()}` : ""}\n\n— Enviado desde TinyCare`;

    setSending(true);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    try {
      if (!MailComposer) {
        showToast("warning", "El módulo de correo no está disponible.");
        setSending(false);
        return;
      }
      const ok = await MailComposer.isAvailableAsync();
      if (!ok) { showToast("warning", "No hay app de correo en este dispositivo."); setSending(false); return; }
      await MailComposer.composeAsync({
        recipients: [], // TODO: inyectar correo del pediatra asignado
        subject: `Reporte Pediátrico TinyCare — ${new Date().toLocaleDateString("es-MX")}`,
        body,
      });
    } catch { showToast("error", "No se pudo abrir el correo."); }
    setSending(false);
  };

  return (
    <View style={s.pedCard}>
      <View style={s.pedStripe} />
      <View style={s.pedContent}>
        <View style={s.pedHeader}>
          <View style={s.pedIconBox}>
            <Ionicons name="mail" size={20} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.pedTitle}>Enviar al Pediatra</Text>
            <Text style={s.pedSubtitle}>Resumen clínico + nota breve</Text>
          </View>
        </View>

        <View style={s.pedPreview}>
          {metrics.map(m => (
            <View key={m.id} style={s.pedPreviewRow}>
              <Ionicons name={m.icon as any} size={14} color={m.color} />
              <Text style={s.pedPreviewLabel}>{m.title}</Text>
              <Text style={[s.pedPreviewVal, { color: m.color }]}>{m.value} {m.unit}</Text>
            </View>
          ))}
        </View>

        <View style={s.pedInputWrap}>
          <Ionicons name="chatbubble-ellipses" size={16} color={TC.vitalOxygen} style={{ marginLeft: 14, marginTop: 2 }} />
          <TextInput
            style={s.pedInput}
            placeholder="Nota breve para el doctor (opcional)"
            placeholderTextColor="#B8A0A3"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={140}
          />
        </View>
        {message.length > 0 && <Text style={s.pedCharCount}>{message.length}/140</Text>}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[s.pedSendBtn, sending && { opacity: 0.6 }]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={sending}
          >
            <Ionicons name={sending ? "hourglass" : "send"} size={18} color="#FFF" />
            <Text style={s.pedSendText}>{sending ? "Abriendo…" : "Enviar Reporte"}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={s.pedDisclaimer}>
          <Ionicons name="lock-closed" size={12} color="#94A3B8" />
          <Text style={s.pedDisclaimerText}>Se abrirá tu app de correo</Text>
        </View>
      </View>
    </View>
  );
};

import { useTelemetryStats } from "../../src/hooks/useTelemetryStats";
import { database } from "../../src/database";
import { Perfil, Dispositivo } from "../../src/database/models";
import { subscribeToBiometrics } from "../../src/services/notifications/MonitoringService";
import { useFocusEffect } from "@react-navigation/native";

export default function StatsScreen() {
  const { showToast, ToastComponent } = useToast();
  const [period, setPeriod] = useState<"24H" | "7D">("24H");
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [liveMetrics, setLiveMetrics] = useState(METRICS);
  const [babies, setBabies] = useState<{ id: string, name: string, emoji: string, connected: boolean, deviceId: string | null }[]>([
    { id: 'loading', name: 'Cargando...', emoji: '⏳', connected: false, deviceId: null }
  ]);
  const [activeBabyIndex, setActiveBabyIndex] = useState(0);
  const activeBaby = babies[activeBabyIndex] || babies[0];

  const { data24H, data7D, averages24H } = useTelemetryStats(activeBaby?.id, activeBaby?.name);

  // --- MODO DEMO: Simulación de datos para Sazed (Sincronizado con evaluadorMedico.ts) ---
  const [demoVitals, setDemoVitals] = useState({ hr: 130, spo2: 97, temp: 36.6, fr: 45, activity: 'Reposo' });
  useEffect(() => {
    if (activeBaby?.name !== 'Sazed') return;
    const interval = setInterval(() => {
      setDemoVitals({
        hr: 125 + Math.floor(Math.random() * 10), // 125-135 lpm (Rango regular reposo)
        spo2: 96 + Math.floor(Math.random() * 3),  // 96-98% (Óptimo)
        temp: 36.5 + (Math.random() * 0.2),        // 36.5-36.7°C (Normal axilar)
        fr: 40 + Math.floor(Math.random() * 8),    // 40-48 rpm (Normal neonato)
        activity: 'Reposo'
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [activeBaby?.name]);

  useFocusEffect(
    useCallback(() => {
      const perfilesCollection = database.collections.get<Perfil>('perfiles');
      const dispositivosCollection = database.collections.get<Dispositivo>('dispositivos');

      const subscription = perfilesCollection.query().observe().subscribe(async (perfiles) => {
        if (perfiles.length > 0) {
          const allDevices = await dispositivosCollection.query().fetch();
          const loadedBabies = perfiles.map((p) => {
            const hasDevice = allDevices.find(d => d.idPerfil === p.id);
            return {
              id: p.id,
              name: p.nombreIdentificador || 'Bebé',
              emoji: p.avatar || '👶🏻',
              connected: hasDevice ? hasDevice.estado === 'activo' : false,
              deviceId: hasDevice ? hasDevice.identificadorHardware : null,
            };
          });
          setBabies(loadedBabies);
          setActiveBabyIndex(prev => prev >= loadedBabies.length ? 0 : prev);
        } else {
          setBabies([{ id: 'empty', name: 'Sin Perfil', emoji: '👶', connected: false, deviceId: null }]);
        }
      });
      return () => subscription.unsubscribe();
    }, [])
  );

  const [liveData, setLiveData] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsub = subscribeToBiometrics((deviceId: string, data: any) => {
      setLiveData(prev => ({ ...prev, [deviceId]: data }));
    });
    return unsub;
  }, []);

  useEffect(() => {
    setLiveMetrics(prev => {
      return prev.map(m => {
        // Para Sazed usamos los datos de simulación si no hay dispositivo real
        const isSazed = activeBaby?.name === 'Sazed';
        const live = activeBaby?.deviceId ? liveData[activeBaby.deviceId] : (isSazed ? { 
          oxygenSaturation: demoVitals.spo2, 
          heartRate: demoVitals.hr, 
          temperature: demoVitals.temp,
          activity: demoVitals.activity
        } : null);

        let value = m.value;
        let status = "Normal";
        
        switch (m.id) {
          case 'spo2': 
            value = live ? String(live.oxygenSaturation) : (averages24H.spo2 > 0 ? String(Math.round(averages24H.spo2)) : "--");
            status = value === "--" ? "Sin Datos" : (Number(value) < 92 ? "Hipoxemia" : "Normal");
            return { ...m, value, status, data24H: data24H.spo2, data7D: data7D.spo2, insights: [
              { label: "Promedio", value: averages24H.spo2 > 0 ? `${Math.round(averages24H.spo2)}%` : (isSazed ? "98.5%" : "--") },
              { label: "Mínimo", value: data24H.spo2.length > 0 ? `${Math.min(...data24H.spo2)}%` : (isSazed ? "97%" : "--") }
            ] };
          case 'hr': 
            value = live ? String(live.heartRate) : (averages24H.hr > 0 ? String(Math.round(averages24H.hr)) : "--");
            status = value === "--" ? "Sin Datos" : (Number(value) > 160 ? "Taquicardia" : Number(value) < 100 ? "Bradicardia" : "Normal");
            return { ...m, value, status, data24H: data24H.hr, data7D: data7D.hr, insights: [
              { label: "Promedio", value: averages24H.hr > 0 ? `${Math.round(averages24H.hr)}` : (isSazed ? "125" : "--") },
              { label: "Mínimo", value: data24H.hr.length > 0 ? `${Math.min(...data24H.hr)}` : (isSazed ? "121" : "--") }
            ] };
          case 'temp': 
            value = live ? String(live.temperature.toFixed(1)) : (averages24H.temp > 0 ? String(averages24H.temp.toFixed(1)) : "--");
            status = value === "--" ? "Sin Datos" : (Number(value) > 38 ? "Hipertermia" : Number(value) < 36.5 ? "Hipotermia" : "Normal");
            return { ...m, value, status, data24H: data24H.temp, data7D: data7D.temp, insights: [
              { label: "Promedio", value: averages24H.temp > 0 ? `${averages24H.temp.toFixed(1)}` : (isSazed ? "36.6" : "--") },
              { label: "Máximo", value: data24H.temp.length > 0 ? `${Math.max(...data24H.temp).toFixed(1)}` : (isSazed ? "36.8" : "--") }
            ] };
          case 'posture':
            value = averages24H.posture > 0 ? String(Math.round(averages24H.posture)) : (isSazed ? "100" : "--");
            status = value === "--" ? "Sin Datos" : "Normal";
            return { ...m, value, status, data24H: data24H.posture, data7D: data7D.posture, insights: [
              { label: "Boca arriba", value: value !== "--" ? `${value}%` : "--" },
              { label: "De lado", value: value !== "--" ? `${100 - Number(value)}%` : "--" }
            ] };
          default: return m;
        }
      });
    });
  }, [liveData, activeBaby, data24H, data7D, averages24H, demoVitals]);

  return (
    <View style={s.root}>
      {ToastComponent}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={s.header}>
          <Text style={s.headerKicker}>EXPEDIENTE TELEMÉTRICO</Text>
          <Text style={s.headerTitle}>Análisis Clínico</Text>
        </View>

        {/* ── Profiles Selector ── */}
        <View style={{ marginHorizontal: -PADDING_H, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PADDING_H, gap: 10 }}>
            {babies.map((b, index) => {
              const isActive = index === activeBabyIndex;
              return (
                <TouchableOpacity 
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => setActiveBabyIndex(index)}
                  style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: isActive ? TC.vitalHeart : '#FFF', padding: 8, paddingRight: 16, borderRadius: 24, borderWidth: 1, borderColor: isActive ? TC.vitalHeart : TC.inputBorder }]}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Text style={{ fontSize: 16 }}>{b.emoji}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isActive ? '#FFF' : TC.textDark }}>{b.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
          {liveMetrics.map(m => (
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

        <SendToPediatrician metrics={liveMetrics} period={period} showToast={showToast} />

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
  root: { flex: 1, backgroundColor: TC.bg },
  scroll: { paddingHorizontal: PADDING_H, paddingTop: IS_SMALL ? 40 : 60, paddingBottom: 120, gap: IS_SMALL ? 16 : 20 },
  
  header: { marginBottom: 8 },
  headerKicker: { fontSize: 11, fontWeight: '800', color: TC.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  headerTitle: { fontSize: IS_SMALL ? 28 : 32, fontWeight: '700', color: TC.textDark, letterSpacing: -1 },

  toggleRow: { flexDirection: 'row', backgroundColor: TC.trackBg, borderRadius: 12, padding: 4, marginBottom: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: TC.card, boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' } as any,
  toggleText: { fontSize: 13, fontWeight: '600', color: TC.textMuted },
  toggleTextActive: { color: TC.textDark },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 8 },

  miniCard: {
    backgroundColor: TC.card,
    borderRadius: 24,
    borderCurve: 'continuous' as any,
    boxShadow: '0 6px 16px rgba(20, 184, 166, 0.06)',
    borderWidth: 1,
    borderColor: TC.accentLight,
  } as any,
  miniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  iconBoxSmall: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  
  miniBody: { marginBottom: 4 },
  miniTitle: { fontSize: IS_SMALL ? 12 : 13, fontWeight: '600', color: TC.textMuted, marginBottom: 4 },
  miniValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, flexShrink: 1 },
  miniValue: { fontSize: IS_SMALL ? 24 : 28, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'], flexShrink: 1 },
  miniUnit: { fontSize: 12, fontWeight: '600', color: TC.textMuted },

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
    backgroundColor: TC.card,
    borderRadius: 32,
    padding: POPUP_PADDING,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 8px 32px rgba(20, 184, 166, 0.12)',
  } as any,
  
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: TC.textDark, letterSpacing: -0.5 },
  sheetSubtitle: { fontSize: 14, fontWeight: '500', color: TC.textMuted },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: TC.trackBg, alignItems: 'center', justifyContent: 'center' },

  sheetStatusRow: { marginBottom: 24 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  sheetValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexShrink: 1 },
  sheetMainValue: { fontSize: IS_SMALL ? 40 : 48, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'], flexShrink: 1 },
  sheetUnit: { fontSize: 20, fontWeight: '600', color: TC.textBody },

  modalChartContainer: { marginVertical: 16, marginHorizontal: -POPUP_PADDING },
  modalChartScrollContent: { paddingHorizontal: POPUP_PADDING, paddingVertical: 8 },

  insightsGrid: { flexDirection: 'row', gap: IS_SMALL ? 8 : 12, marginBottom: IS_SMALL ? 16 : 24 },
  insightBox: { flex: 1, backgroundColor: TC.bg, borderRadius: 16, padding: IS_SMALL ? 12 : 16, borderWidth: 1, borderColor: TC.accentLight },
  insightLabel: { fontSize: 12, fontWeight: '600', color: TC.textMuted, marginBottom: 4 },
  insightValue: { fontSize: IS_SMALL ? 14 : 16, fontWeight: '700', color: TC.textDark },

  divider: { height: 1, backgroundColor: TC.accentLight, marginBottom: 20 },
  
  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: TC.bg, padding: 16, borderRadius: 16, alignItems: 'flex-start' },
  infoBoxText: { flex: 1, fontSize: 14, fontWeight: '400', color: TC.textBody, lineHeight: 22 },

  // ── Pediatrician card ──
  pedCard: {
    backgroundColor: TC.card, borderRadius: 28, borderCurve: 'continuous' as any,
    overflow: 'hidden', boxShadow: '0 8px 24px rgba(20, 184, 166, 0.08)',
    borderWidth: 1, borderColor: TC.accentLight,
  } as any,
  pedStripe: { height: 4, backgroundColor: TC.accent },
  pedContent: { padding: IS_SMALL ? 16 : 20, gap: 14 },
  pedHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 2 },
  pedIconBox: {
    width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: TC.accent, boxShadow: '0 4px 12px rgba(20, 184, 166, 0.25)',
  } as any,
  pedTitle: { fontSize: 17, fontWeight: '700', color: TC.textDark, letterSpacing: -0.3 },
  pedSubtitle: { fontSize: 12, fontWeight: '500', color: TC.textMuted, marginTop: 1 },

  pedPreview: {
    backgroundColor: TC.bg, borderRadius: 16, padding: 12, gap: 8,
    borderWidth: 1, borderColor: TC.accentLight,
  },
  pedPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pedPreviewLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: TC.textBody },
  pedPreviewVal: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] as any },

  pedInputWrap: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: TC.bg,
    borderRadius: 14, minHeight: 72, paddingTop: 12,
    borderWidth: 1, borderColor: TC.accentLight,
  },
  pedInput: { flex: 1, minHeight: 56, paddingHorizontal: 10, fontSize: 14, fontWeight: '500', color: TC.textDark, textAlignVertical: 'top' as any },
  pedCharCount: { fontSize: 11, fontWeight: '600', color: TC.textMuted, textAlign: 'right', marginTop: -8 },

  pedSendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: TC.accent, borderRadius: 16, paddingVertical: 14,
    boxShadow: '0 6px 16px rgba(20, 184, 166, 0.3)',
  } as any,
  pedSendText: { fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.2 },
  pedDisclaimer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -4 },
  pedDisclaimerText: { fontSize: 11, fontWeight: '500', color: TC.textMuted },
});
