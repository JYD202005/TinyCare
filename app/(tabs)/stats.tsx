import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import {
  getScreenTopPadding,
  SharedStyles,
  Typography,
} from "../../components/styles";
import { TC } from "../../components/theme";
import { useToast } from "../../components/Toast";

interface TrendChartProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
  showDots?: boolean;
}

const TrendChart = ({
  data,
  color,
  height = 80,
  width,
  showDots = true,
}: TrendChartProps) => {
  const [measuredWidth, setMeasuredWidth] = useState<number>(width || 0);
  const currentWidth = width || measuredWidth || 120;

  const safeData =
    !data || data.length === 0
      ? [0, 0]
      : data.length === 1
        ? [data[0], data[0]]
        : data;

  const minVal = Math.min(...safeData);
  const maxVal = Math.max(...safeData);
  const diff = maxVal - minVal;
  const min = minVal - (diff === 0 ? 1 : diff * 0.2);
  const max = maxVal + (diff === 0 ? 1 : diff * 0.2);
  const range = max - min || 1;

  const paddingX = showDots ? 10 : 4;
  const paddingY = showDots ? 10 : 4;
  const innerWidth = Math.max(currentWidth - paddingX * 2, 10);
  const innerHeight = Math.max(height - paddingY * 2, 10);

  const stepX = innerWidth / Math.max(safeData.length - 1, 1);

  const points = safeData.map((val, i) => {
    const x = paddingX + i * stepX;
    const y = paddingY + innerHeight - ((val - min) / range) * innerHeight;
    return { x, y };
  });

  // Catmull-Rom to Cubic Bezier curve for smooth aesthetic
  let pathData = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  if (points.length > 2) {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? i + 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathData += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
  } else if (points.length === 2) {
    pathData += ` L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
  }

  const lastX = points[points.length - 1].x.toFixed(1);
  const firstX = points[0].x.toFixed(1);
  const fillPath = `${pathData} L ${lastX},${height} L ${firstX},${height} Z`;

  const cleanColorId = (color || "teal").replace(/[^a-zA-Z0-9]/g, "");

  return (
    <View
      style={{ height, width: width ? width : "100%", overflow: "hidden" }}
      onLayout={(e) => {
        if (!width) {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 10 && Math.abs(w - measuredWidth) > 1) {
            setMeasuredWidth(w);
          }
        }
      }}
    >
      {currentWidth > 0 && (
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${currentWidth} ${height}`}
        >
          <Defs>
            <LinearGradient
              id={`grad-${cleanColorId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop offset="0" stopColor={color} stopOpacity="0.25" />
              <Stop offset="1" stopColor={color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          <Path d={fillPath} fill={`url(#grad-${cleanColorId})`} />
          <Path
            d={pathData}
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {showDots &&
            points.map((pt, i) => (
              <Circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#FFF"
                stroke={color}
                strokeWidth={2}
              />
            ))}
        </Svg>
      )}
    </View>
  );
};

const MetricMiniCard = ({ metric, period, onPress }: any) => {
  const data = period === "24H" ? metric.data24H : metric.data7D;
  const isNormal = metric.status === "Normal";
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(metric.value);

  useEffect(() => {
    if (prevValue.current !== metric.value) {
      prevValue.current = metric.value;
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [metric.value]);

  return (
    <TouchableOpacity
      style={s.miniCard}
      onPress={() => onPress(metric)}
      activeOpacity={0.7}
    >
      <View style={s.miniHeader}>
        <View
          style={[s.iconBoxSmall, { backgroundColor: metric.color + "15" }]}
        >
          <Ionicons name={metric.icon} size={16} color={metric.color} />
        </View>
        <View
          style={[
            s.statusDot,
            { backgroundColor: isNormal ? "#10B981" : "#EF4444" },
          ]}
        />
      </View>

      <Animated.View style={[s.miniBody, { opacity: pulseAnim }]}>
        <Text style={s.miniTitle} numberOfLines={1}>
          {metric.title}
        </Text>
        <View style={s.miniValueRow}>
          <Text
            style={[s.miniValue, { color: metric.color }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metric.value}
          </Text>
          <Text style={s.miniUnit}>{metric.unit}</Text>
        </View>
      </Animated.View>

      <View style={s.miniChartWrapper}>
        <TrendChart
          data={data}
          color={metric.color}
          height={38}
          showDots={false}
        />
      </View>
    </TouchableOpacity>
  );
};

const ExpandedMetricModal = ({ metric, period, visible, onClose }: any) => {
  const { width: windowWidth } = useWindowDimensions();
  const isSmall = windowWidth < 380;
  const popupPadding = isSmall ? 16 : 20;
  const modalInnerWidth =
    Math.min(windowWidth - (isSmall ? 32 : 40), 400) - popupPadding * 2;

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
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!metric) return null;

  const data = period === "24H" ? metric.data24H : metric.data7D;
  const isNormal = metric.status === "Normal";
  const modalChartWidth = Math.max(
    modalInnerWidth,
    data.length * (period === "24H" ? 36 : 48),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.modalOverlayCenter}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            s.modalPopup,
            {
              padding: popupPadding,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={s.sheetHeader}>
            <View style={s.sheetHeaderLeft}>
              <View
                style={[s.iconBox, { backgroundColor: metric.color + "15" }]}
              >
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
            <View
              style={[
                s.statusBadge,
                { backgroundColor: isNormal ? "#ECFDF5" : "#FEF2F2" },
              ]}
            >
              <Text
                style={[
                  s.statusText,
                  { color: isNormal ? "#059669" : "#DC2626" },
                ]}
              >
                ESTADO: {metric.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={s.sheetValueRow}>
            <Text
              style={[s.sheetMainValue, { color: metric.color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {metric.value}
            </Text>
            <Text style={s.sheetUnit}>{metric.unit}</Text>
          </View>

          <View
            style={[s.modalChartContainer, { marginHorizontal: -popupPadding }]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                s.modalChartScrollContent,
                { paddingHorizontal: popupPadding },
              ]}
            >
              <TrendChart
                data={data}
                color={metric.color}
                height={120}
                width={modalChartWidth}
                showDots={true}
              />
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
            <Ionicons
              name="information-circle"
              size={20}
              color={metric.color}
            />
            <Text style={s.infoBoxText}>{metric.info}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const METRICS = [
  {
    id: "spo2",
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
    ],
  },
  {
    id: "hr",
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
    ],
  },
  {
    id: "temp",
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
    ],
  },
  {
    id: "posture",
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
    ],
  },
];

/* ── Send to Pediatrician ── */
const SendToPediatrician = ({
  metrics,
  period,
  patientName,
  showToast,
}: {
  metrics: typeof METRICS;
  period: string;
  patientName: string;
  showToast: any;
}) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleSend = async () => {
    setSending(true);
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      if (Platform.OS !== "web") {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          showToast(
            "warning",
            "La opción de compartir/descargar no está disponible en este dispositivo.",
          );
          setSending(false);
          return;
        }
      }

      const today = new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      let tableRows = metrics
        .map((m) => {
          const data = period === "24H" ? m.data24H : m.data7D;
          const avg =
            data.length > 0
              ? (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)
              : "--";
          const statusColor =
            m.status === "Normal"
              ? "#059669"
              : m.status === "Sin Datos"
                ? "#94A3B8"
                : "#DC2626";
          return `
          <tr>
            <td><strong>${m.fullName}</strong><br><small style="color: #64748B;">${m.subtitle}</small></td>
            <td style="font-size: 18px; font-weight: bold; color: ${m.color};">${m.value} <span style="font-size: 12px; color: #64748B;">${m.unit}</span></td>
            <td>${avg} ${m.unit}</td>
            <td><span style="background-color: ${statusColor}20; color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">${m.status}</span></td>
          </tr>
        `;
        })
        .join("");

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; margin: 0; padding: 40px; }
              .header { border-bottom: 2px solid #14B8A6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
              .title { margin: 0; color: #0F172A; font-size: 28px; }
              .subtitle { margin: 4px 0 0 0; color: #64748B; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
              .patient-card { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
              .patient-card p { margin: 5px 0; font-size: 15px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { text-align: left; background-color: #F1F5F9; padding: 12px; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #CBD5E1; }
              td { padding: 16px 12px; border-bottom: 1px solid #E2E8F0; vertical-align: middle; }
              .notes { background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px; padding: 20px; color: #92400E; margin-bottom: 30px; }
              .footer { text-align: center; font-size: 12px; color: #94A3B8; margin-top: 50px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1 class="title">Expediente Telemétrico</h1>
                <p class="subtitle">TinyCare Smart Monitor</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 14px; font-weight: bold;">Generado el:</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748B;">${today}</p>
              </div>
            </div>

            <div class="patient-card">
              <p><strong>Paciente:</strong> ${patientName}</p>
              <p><strong>Periodo de Análisis:</strong> ${period === "24H" ? "Últimas 24 Horas" : "Últimos 7 Días"}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Biomarcador</th>
                  <th>Lectura Actual</th>
                  <th>Promedio Periodo</th>
                  <th>Estado Clínico</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            ${
              message.trim()
                ? `
              <div class="notes">
                <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase;">Nota del Tutor / Observaciones:</h3>
                <p style="margin: 0; font-size: 15px; line-height: 1.5;">${message.trim()}</p>
              </div>
            `
                : ""
            }

            <p style="font-size: 13px; color: #64748B; line-height: 1.6;">
              <strong>Nota Clínica:</strong> Este reporte es generado automáticamente a partir de los datos recopilados por los sensores wearables de TinyCare. 
              No sustituye el juicio médico profesional ni constituye un diagnóstico. Recomendamos correlacionar estos hallazgos con la evaluación física del paciente.
            </p>

            <div class="footer">
              Generado de forma segura en modo local a través de TinyCare App.
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === "web") {
        const loadScript = (src: string) =>
          new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`))
              return resolve(true);
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

        try {
          await loadScript(
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
          );
          await loadScript(
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js",
          );

          const jsPDF = (window as any).jspdf.jsPDF;
          const doc = new jsPDF();

          doc.setFontSize(22);
          doc.setTextColor(15, 23, 42);
          doc.text("Expediente Telemetrico", 14, 20);

          doc.setFontSize(12);
          doc.setTextColor(100, 116, 139);
          doc.text("TinyCare Smart Monitor", 14, 28);

          doc.setFontSize(10);
          doc.text(`Generado el: ${today}`, 14, 34);

          doc.setFontSize(12);
          doc.setTextColor(51, 65, 85);
          doc.text(`Paciente: ${patientName}`, 14, 45);
          doc.text(
            `Periodo de Analisis: ${period === "24H" ? "Ultimas 24 Horas" : "Ultimos 7 Dias"}`,
            14,
            52,
          );

          const tableBody = metrics.map((m) => {
            const data = period === "24H" ? m.data24H : m.data7D;
            const avg =
              data.length > 0
                ? (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)
                : "--";
            return [
              m.fullName,
              `${m.value} ${m.unit}`,
              `${avg} ${m.unit}`,
              m.status,
            ];
          });

          doc.autoTable({
            startY: 60,
            head: [
              [
                "Biomarcador",
                "Lectura Actual",
                "Promedio Periodo",
                "Estado Clinico",
              ],
            ],
            body: tableBody,
            theme: "striped",
            headStyles: { fillColor: [20, 184, 166] },
            styles: { font: "helvetica", fontSize: 10 },
          });

          if (message.trim()) {
            const finalY = doc.lastAutoTable.finalY || 60;
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text("Nota del Tutor / Observaciones:", 14, finalY + 15);
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            const splitTitle = doc.splitTextToSize(message.trim(), 180);
            doc.text(splitTitle, 14, finalY + 22);
          }

          doc.save(`Reporte_${patientName.replace(/\s+/g, "_")}_${period}.pdf`);
        } catch (error) {
          console.error("Error cargando jsPDF:", error);
          showToast("error", "Error generando el PDF en Web.");
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Descargar Reporte Médico (PDF)",
          UTI: "com.adobe.pdf",
        });
      }
    } catch (e) {
      console.error(e);
      showToast("error", "No se pudo generar el documento PDF.");
    }
    setSending(false);
  };

  return (
    <View style={s.pedCard}>
      <View style={s.pedStripe} />
      <View style={s.pedContent}>
        <View style={s.pedHeader}>
          <View style={s.pedIconBox}>
            <Ionicons name="download-outline" size={20} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.pedTitle}>Descargar Reporte</Text>
            <Text style={s.pedSubtitle}>Resumen clínico + nota breve</Text>
          </View>
        </View>

        <View style={s.pedPreview}>
          {metrics.map((m) => (
            <View key={m.id} style={s.pedPreviewRow}>
              <Ionicons name={m.icon as any} size={14} color={m.color} />
              <Text style={s.pedPreviewLabel}>{m.title}</Text>
              <Text style={[s.pedPreviewVal, { color: m.color }]}>
                {m.value} {m.unit}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.pedInputWrap}>
          <Ionicons
            name="chatbubble-ellipses"
            size={16}
            color={TC.vitalOxygen}
            style={{ marginLeft: 14, marginTop: 2 }}
          />
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
        {message.length > 0 && (
          <Text style={s.pedCharCount}>{message.length}/140</Text>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[s.pedSendBtn, sending && { opacity: 0.6 }]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={sending}
          >
            <Ionicons
              name={sending ? "hourglass" : "download"}
              size={18}
              color="#FFF"
            />
            <Text style={s.pedSendText}>
              {sending ? "Generando…" : "Descargar Documento"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={s.pedDisclaimer}>
          <Ionicons name="document-text" size={12} color="#94A3B8" />
          <Text style={s.pedDisclaimerText}>
            Se generará un reporte clínico en PDF
          </Text>
        </View>
      </View>
    </View>
  );
};

import { useFocusEffect } from "@react-navigation/native";
import { database } from "../../src/database";
import { Dispositivo, Perfil } from "../../src/database/models";
import { useTelemetryStats } from "../../src/hooks/useTelemetryStats";
import { subscribeToBiometrics } from "../../src/services/notifications/MonitoringService";

export default function StatsScreen() {
  const { showToast, ToastComponent } = useToast();
  const [period, setPeriod] = useState<"24H" | "7D">("24H");
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [liveMetrics, setLiveMetrics] = useState(METRICS);
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

  const { data24H, data7D, averages24H } = useTelemetryStats(
    activeBaby?.id,
    activeBaby?.name,
  );

  // --- MODO DEMO: Simulación de datos para Sazed (Sincronizado con evaluadorMedico.ts) ---
  const [demoVitals, setDemoVitals] = useState({
    hr: 130,
    spo2: 97,
    temp: 36.6,
    fr: 45,
    activity: "Reposo",
  });
  useEffect(() => {
    if (activeBaby?.name !== "Sazed") return;
    const interval = setInterval(() => {
      setDemoVitals({
        hr: 125 + Math.floor(Math.random() * 10), // 125-135 lpm (Rango regular reposo)
        spo2: 96 + Math.floor(Math.random() * 3), // 96-98% (Óptimo)
        temp: 36.5 + Math.random() * 0.2, // 36.5-36.7°C (Normal axilar)
        fr: 40 + Math.floor(Math.random() * 8), // 40-48 rpm (Normal neonato)
        activity: "Reposo",
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [activeBaby?.name]);

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
            setActiveBabyIndex((prev) =>
              prev >= loadedBabies.length ? 0 : prev,
            );
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
      return () => subscription.unsubscribe();
    }, []),
  );

  const [liveData, setLiveData] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsub = subscribeToBiometrics((deviceId: string, data: any) => {
      setLiveData((prev) => ({ ...prev, [deviceId]: data }));
    });
    return unsub;
  }, []);

  useEffect(() => {
    setLiveMetrics((prev) => {
      return prev.map((m) => {
        // Para Sazed usamos los datos de simulación si no hay dispositivo real
        const isSazed = activeBaby?.name === "Sazed";
        const live = activeBaby?.deviceId
          ? liveData[activeBaby.deviceId]
          : isSazed
            ? {
                oxygenSaturation: demoVitals.spo2,
                heartRate: demoVitals.hr,
                temperature: demoVitals.temp,
                activity: demoVitals.activity,
              }
            : null;

        let value = m.value;
        let status = "Normal";

        switch (m.id) {
          case "spo2":
            value = live
              ? String(live.oxygenSaturation)
              : averages24H.spo2 > 0
                ? String(Math.round(averages24H.spo2))
                : "--";
            status =
              value === "--"
                ? "Sin Datos"
                : Number(value) < 92
                  ? "Hipoxemia"
                  : "Normal";
            return {
              ...m,
              value,
              status,
              data24H: data24H.spo2,
              data7D: data7D.spo2,
              insights: [
                {
                  label: "Promedio",
                  value:
                    averages24H.spo2 > 0
                      ? `${Math.round(averages24H.spo2)}%`
                      : isSazed
                        ? "98.5%"
                        : "--",
                },
                {
                  label: "Mínimo",
                  value:
                    data24H.spo2.length > 0
                      ? `${Math.min(...data24H.spo2)}%`
                      : isSazed
                        ? "97%"
                        : "--",
                },
              ],
            };
          case "hr":
            value = live
              ? String(live.heartRate)
              : averages24H.hr > 0
                ? String(Math.round(averages24H.hr))
                : "--";
            status =
              value === "--"
                ? "Sin Datos"
                : Number(value) > 160
                  ? "Taquicardia"
                  : Number(value) < 100
                    ? "Bradicardia"
                    : "Normal";
            return {
              ...m,
              value,
              status,
              data24H: data24H.hr,
              data7D: data7D.hr,
              insights: [
                {
                  label: "Promedio",
                  value:
                    averages24H.hr > 0
                      ? `${Math.round(averages24H.hr)}`
                      : isSazed
                        ? "125"
                        : "--",
                },
                {
                  label: "Mínimo",
                  value:
                    data24H.hr.length > 0
                      ? `${Math.min(...data24H.hr)}`
                      : isSazed
                        ? "121"
                        : "--",
                },
              ],
            };
          case "temp":
            value = live
              ? String(live.temperature.toFixed(1))
              : averages24H.temp > 0
                ? String(averages24H.temp.toFixed(1))
                : "--";
            status =
              value === "--"
                ? "Sin Datos"
                : Number(value) > 38
                  ? "Hipertermia"
                  : Number(value) < 36.5
                    ? "Hipotermia"
                    : "Normal";
            return {
              ...m,
              value,
              status,
              data24H: data24H.temp,
              data7D: data7D.temp,
              insights: [
                {
                  label: "Promedio",
                  value:
                    averages24H.temp > 0
                      ? `${averages24H.temp.toFixed(1)}`
                      : isSazed
                        ? "36.6"
                        : "--",
                },
                {
                  label: "Máximo",
                  value:
                    data24H.temp.length > 0
                      ? `${Math.max(...data24H.temp).toFixed(1)}`
                      : isSazed
                        ? "36.8"
                        : "--",
                },
              ],
            };
          case "posture":
            value =
              averages24H.posture > 0
                ? String(Math.round(averages24H.posture))
                : isSazed
                  ? "100"
                  : "--";
            status = value === "--" ? "Sin Datos" : "Normal";
            return {
              ...m,
              value,
              status,
              data24H: data24H.posture,
              data7D: data7D.posture,
              insights: [
                {
                  label: "Boca arriba",
                  value: value !== "--" ? `${value}%` : "--",
                },
                {
                  label: "De lado",
                  value: value !== "--" ? `${100 - Number(value)}%` : "--",
                },
              ],
            };
          default:
            return m;
        }
      });
    });
  }, [liveData, activeBaby, data24H, data7D, averages24H, demoVitals]);

  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  return (
    <View style={SharedStyles.screenRoot}>
      {ToastComponent}
      <ScrollView
        contentContainerStyle={[
          SharedStyles.screenScrollContent,
          { paddingTop: getScreenTopPadding(insets.top), gap: 14 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={SharedStyles.screenHeader}>
          <View>
            <Text style={Typography.eyebrow}>EXPEDIENTE TELEMÉTRICO</Text>
            <Text style={Typography.screenTitle}>Análisis Clínico</Text>
          </View>
        </View>

        {/* ── Profiles Selector ── */}
        <View style={SharedStyles.profilesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={SharedStyles.profilesContainer}
          >
            {babies.map((b, index) => {
              const isActive = index === activeBabyIndex;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => setActiveBabyIndex(index)}
                  style={[
                    SharedStyles.profilePill,
                    isActive && SharedStyles.profilePillActive,
                  ]}
                >
                  <View
                    style={[
                      SharedStyles.profileEmojiBox,
                      isActive && SharedStyles.profileEmojiBoxActive,
                    ]}
                  >
                    <Text style={SharedStyles.profileEmoji}>{b.emoji}</Text>
                  </View>
                  <View style={SharedStyles.profileInfo}>
                    <Text
                      style={[
                        SharedStyles.profileName,
                        isActive && SharedStyles.profileNameActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                    {isActive && (
                      <Text style={SharedStyles.profileStatus}>
                        Monitoreando
                      </Text>
                    )}
                  </View>
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
            <Text
              style={[s.toggleText, period === "24H" && s.toggleTextActive]}
            >
              Últimas 24H
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, period === "7D" && s.toggleBtnActive]}
            onPress={() => setPeriod("7D")}
            activeOpacity={0.7}
          >
            <Text style={[s.toggleText, period === "7D" && s.toggleTextActive]}>
              Últimos 7 Días
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.metricsGrid}>
          {liveMetrics.map((m) => (
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
              Todos los biomarcadores se encuentran dentro de los parámetros
              pediátricos seguros.
            </Text>
          </View>
        </View>

        <SendToPediatrician
          metrics={liveMetrics}
          period={period}
          patientName={activeBaby?.name}
          showToast={showToast}
        />
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
  scroll: {
    paddingTop: 48,
    paddingBottom: 120,
    gap: 16,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },

  header: { marginBottom: 4 },
  headerKicker: {
    fontSize: 11,
    fontWeight: "800",
    color: TC.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: TC.textDark,
    letterSpacing: -1,
  },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: TC.trackBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: TC.card,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
  } as any,
  toggleText: { fontSize: 13, fontWeight: "600", color: TC.textMuted },
  toggleTextActive: { color: TC.textDark },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 4,
    width: "100%",
  },

  miniCard: {
    width: "48%",
    backgroundColor: TC.card,
    borderRadius: 22,
    padding: 12,
    paddingBottom: 8,
    borderCurve: "continuous" as any,
    boxShadow: "0 4px 14px rgba(20, 184, 166, 0.06)",
    borderWidth: 1,
    borderColor: TC.accentLight,
  } as any,
  miniHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  iconBoxSmall: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },

  miniBody: { marginBottom: 2 },
  miniTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: TC.textMuted,
    marginBottom: 2,
  },
  miniValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    flexShrink: 1,
  },
  miniValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
  },
  miniUnit: { fontSize: 12, fontWeight: "600", color: TC.textMuted },
  miniChartWrapper: { width: "100%", marginTop: 2 },

  alertCard: {
    flexDirection: "row",
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    alignItems: "center",
    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.05)",
  } as any,
  alertTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 13,
    fontWeight: "400",
    color: "#047857",
    lineHeight: 20,
  },

  // Modal styles
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalPopup: {
    backgroundColor: TC.card,
    borderRadius: 28,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 8px 32px rgba(20, 184, 166, 0.12)",
  } as any,

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sheetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TC.textDark,
    letterSpacing: -0.5,
  },
  sheetSubtitle: { fontSize: 13, fontWeight: "500", color: TC.textMuted },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TC.trackBg,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetStatusRow: { marginBottom: 18 },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  sheetValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    flexShrink: 1,
  },
  sheetMainValue: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
  },
  sheetUnit: { fontSize: 18, fontWeight: "600", color: TC.textBody },

  modalChartContainer: { marginVertical: 14 },
  modalChartScrollContent: { paddingVertical: 6 },

  insightsGrid: { flexDirection: "row", gap: 10, marginBottom: 18 },
  insightBox: {
    flex: 1,
    backgroundColor: TC.bg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: TC.accentLight,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: TC.textMuted,
    marginBottom: 4,
  },
  insightValue: { fontSize: 14, fontWeight: "700", color: TC.textDark },

  divider: { height: 1, backgroundColor: TC.accentLight, marginBottom: 16 },

  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: TC.bg,
    padding: 14,
    borderRadius: 14,
    alignItems: "flex-start",
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "400",
    color: TC.textBody,
    lineHeight: 20,
  },

  // ── Pediatrician card ──
  pedCard: {
    backgroundColor: TC.card,
    borderRadius: 24,
    borderCurve: "continuous" as any,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(20, 184, 166, 0.08)",
    borderWidth: 1,
    borderColor: TC.accentLight,
  } as any,
  pedStripe: { height: 4, backgroundColor: TC.accent },
  pedContent: { padding: 18, gap: 14 },
  pedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 2,
  },
  pedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TC.accent,
    boxShadow: "0 4px 12px rgba(20, 184, 166, 0.25)",
  } as any,
  pedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TC.textDark,
    letterSpacing: -0.3,
  },
  pedSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: TC.textMuted,
    marginTop: 1,
  },

  pedPreview: {
    backgroundColor: TC.bg,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: TC.accentLight,
  },
  pedPreviewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pedPreviewLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: TC.textBody,
  },
  pedPreviewVal: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as any,
  },

  pedInputWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: TC.bg,
    borderRadius: 14,
    minHeight: 72,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: TC.accentLight,
  },
  pedInput: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: "500",
    color: TC.textDark,
    textAlignVertical: "top" as any,
  },
  pedCharCount: {
    fontSize: 11,
    fontWeight: "600",
    color: TC.textMuted,
    textAlign: "right",
    marginTop: -8,
  },

  pedSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: TC.accent,
    borderRadius: 16,
    paddingVertical: 14,
    boxShadow: "0 6px 16px rgba(20, 184, 166, 0.3)",
  } as any,
  pedSendText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  pedDisclaimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: -4,
  },
  pedDisclaimerText: { fontSize: 11, fontWeight: "500", color: TC.textMuted },
});
