import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    LinearGradient,
    Path,
    Rect,
    Stop,
    Text as SvgText,
} from "react-native-svg";
import { TC } from "./theme";
import type { ToastType } from "./Toast";

const STORAGE_KEY = "@pediatricians_contacts_v1";

export type PediatricianStatus = "disponible" | "evaluando" | "vinculado";

export interface Pediatrician {
  id: string;
  name: string;
  title: string;
  specialty: string;
  clinic: string;
  distanceKm: number;
  rating: number;
  reviewsCount: number;
  phone: string;
  avatarInitial: string;
  status: PediatricianStatus;
  requestDate?: string;
  linkedDate?: string;
  lastReportSentDate?: string;
  consultationReason?: string;
  coords: { x: number; y: number }; // Coordenadas en porcentaje del mapa (0-100)
}

const INITIAL_PEDIATRICIANS: Pediatrician[] = [
  {
    id: "ped-1",
    name: "Dra. Valeria Montes",
    title: "Médico Pediatra",
    specialty: "Neonatología e Intensivista",
    clinic: "Hospital Infantil Ángeles",
    distanceKm: 0.8,
    rating: 4.9,
    reviewsCount: 142,
    phone: "+52 55 4123 8890",
    avatarInitial: "VM",
    status: "disponible",
    coords: { x: 26, y: 32 },
  },
  {
    id: "ped-2",
    name: "Dr. Alejandro Garza",
    title: "Pediatra Certificado",
    specialty: "Puericultura y Crecimiento",
    clinic: "Clínica Pediátrica Santa María",
    distanceKm: 1.4,
    rating: 4.8,
    reviewsCount: 98,
    phone: "+52 55 7890 2341",
    avatarInitial: "AG",
    status: "disponible",
    coords: { x: 74, y: 28 },
  },
  {
    id: "ped-3",
    name: "Dra. Carmen Ríos",
    title: "Cardióloga Pediátrica",
    specialty: "Monitoreo Cardiorrespiratorio",
    clinic: "Centro Médico Pediátrico ABC",
    distanceKm: 2.1,
    rating: 5.0,
    reviewsCount: 215,
    phone: "+52 55 9812 6543",
    avatarInitial: "CR",
    status: "disponible",
    coords: { x: 34, y: 72 },
  },
  {
    id: "ped-4",
    name: "Dr. Roberto Silva",
    title: "Especialista Pediátrico",
    specialty: "Desarrollo Temprano y Sueño",
    clinic: "Consultorios Médicos San Ángel",
    distanceKm: 2.8,
    rating: 4.7,
    reviewsCount: 76,
    phone: "+52 55 3344 1122",
    avatarInitial: "RS",
    status: "disponible",
    coords: { x: 76, y: 76 },
  },
];

const CONSULTATION_REASONS = [
  "Monitoreo telemétrico continuo de signos vitales",
  "Control preventivo de niño sano",
  "Evaluación de alertas cardiorrespiratorias",
  "Seguimiento de postura y patrones de sueño",
  "Segunda opinión médica especializada",
];

const triggerHaptic = (style: "light" | "medium" | "heavy" | "success") => {
  try {
    if (style === "light")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (style === "medium")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (style === "heavy")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (style === "success")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignorar si no está disponible
  }
};

interface PediatriciansMapSectionProps {
  patientName?: string;
  patientGender?: "boy" | "girl";
  period?: "24H" | "7D";
  metrics?: any[];
  showToast?: (type: ToastType, msg: string) => void;
  onSendPdfReport?: (doctorName: string, note: string) => void;
  onBack?: () => void;
}

export const PediatriciansMapSection: React.FC<
  PediatriciansMapSectionProps
> = ({
  patientName = "Bebé",
  patientGender = "boy",
  period = "24H",
  metrics = [],
  showToast,
  onSendPdfReport,
  onBack,
}) => {
  const [pediatricians, setPediatricians] = useState<Pediatrician[]>(
    INITIAL_PEDIATRICIANS,
  );
  const [selectedPedId, setSelectedPedId] = useState<string>("ped-1");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");

  // Modales
  const [modalRequestDoc, setModalRequestDoc] = useState<Pediatrician | null>(
    null,
  );
  const [requestReason, setRequestReason] = useState<string>(
    CONSULTATION_REASONS[0],
  );
  const [requestNote, setRequestNote] = useState<string>("");
  const [isSubmittingRequest, setIsSubmittingRequest] =
    useState<boolean>(false);

  const [modalSendReportDoc, setModalSendReportDoc] =
    useState<Pediatrician | null>(null);
  const [reportNote, setReportNote] = useState<string>("");
  const [isSendingReport, setIsSendingReport] = useState<boolean>(false);

  // Animaciones de radar y pulso
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Cargar estado persistente de pediatras
    AsyncStorage.getItem(STORAGE_KEY)
      .then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data) as Pediatrician[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPediatricians(parsed);
            }
          } catch {
            // usar iniciales
          }
        }
      })
      .catch(() => {});
  }, []);

  const savePediatricians = useCallback((newList: Pediatrician[]) => {
    setPediatricians(newList);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList)).catch(() => {});
  }, []);

  // Animación continua de radar
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
        Animated.sequence([
          Animated.timing(radarAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(radarAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, radarAnim]);

  const selectedDoc =
    pediatricians.find((p) => p.id === selectedPedId) || pediatricians[0];

  // Enviar solicitud de vinculación
  const handleConfirmRequest = () => {
    if (!modalRequestDoc) return;
    setIsSubmittingRequest(true);
    triggerHaptic("medium");

    setTimeout(() => {
      const nowStr = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updated = pediatricians.map((doc) => {
        if (doc.id === modalRequestDoc.id) {
          return {
            ...doc,
            status: "evaluando" as PediatricianStatus,
            requestDate: nowStr,
            consultationReason: requestReason,
          };
        }
        return doc;
      });

      savePediatricians(updated);
      setIsSubmittingRequest(false);
      setModalRequestDoc(null);
      setRequestNote("");
      triggerHaptic("success");

      if (showToast) {
        showToast(
          "success",
          `Solicitud enviada al consultorio de ${modalRequestDoc.name}. En proceso de evaluación.`,
        );
      }
    }, 900);
  };

  // Simular aprobación médica (para pruebas y experiencia de usuario)
  const handleSimulateApproval = (docId: string) => {
    triggerHaptic("heavy");
    const targetDoc = pediatricians.find((p) => p.id === docId);
    if (!targetDoc) return;

    const nowStr = new Date().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated = pediatricians.map((doc) => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: "vinculado" as PediatricianStatus,
          linkedDate: nowStr,
        };
      }
      return doc;
    });

    savePediatricians(updated);
    triggerHaptic("success");

    Alert.alert(
      "¡Vinculación Médica Aprobada!",
      `${targetDoc.name} ha evaluado el expediente de ${patientName} y aceptó la vinculación. Ahora puedes enviarle reportes telemétricos y ponerte en contacto.`,
      [{ text: "Entendido", style: "default" }],
    );
  };

  // Enviar reporte telemétrico medido
  const handleConfirmSendReport = () => {
    if (!modalSendReportDoc) return;
    setIsSendingReport(true);
    triggerHaptic("medium");

    setTimeout(() => {
      const nowStr = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updated = pediatricians.map((doc) => {
        if (doc.id === modalSendReportDoc.id) {
          return {
            ...doc,
            lastReportSentDate: nowStr,
          };
        }
        return doc;
      });

      savePediatricians(updated);
      setIsSendingReport(false);
      triggerHaptic("success");

      // Si existe callback para generar el PDF también se dispara
      if (onSendPdfReport) {
        onSendPdfReport(modalSendReportDoc.name, reportNote);
      }

      const docName = modalSendReportDoc.name;
      setModalSendReportDoc(null);
      setReportNote("");

      if (showToast) {
        showToast(
          "success",
          `Reporte telemétrico enviado exitosamente al buzón clínico de ${docName}.`,
        );
      }
    }, 1100);
  };

  // Llamar al doctor
  const handleCallDoctor = (phone: string, name: string) => {
    triggerHaptic("light");
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    Alert.alert(
      "Contactar Pediatra",
      `¿Deseas iniciar una llamada directa con ${name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Llamar",
          style: "default",
          onPress: () => {
            Linking.openURL(`tel:${cleanPhone}`).catch(() => {
              Alert.alert("Aviso", `Número de contacto: ${phone}`);
            });
          },
        },
      ],
    );
  };

  // Filtrar lista
  const filteredPediatricians = pediatricians.filter((doc) => {
    if (filterSpecialty === "all") return true;
    if (filterSpecialty === "linked") return doc.status === "vinculado";
    if (filterSpecialty === "eval") return doc.status === "evaluando";
    return true;
  });

  return (
    <View style={styles.sectionContainer}>
      {/* ── Botón de retorno rápido (si se abre en espacio dedicado) ── */}
      {onBack && (
        <TouchableOpacity
          style={styles.backButtonRow}
          onPress={() => {
            triggerHaptic("light");
            onBack();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={17} color={TC.accent} />
          <Text style={styles.backButtonText}>
            Volver al Expediente Clínico
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Encabezado de Sección ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.kickerRow}>
            <View style={styles.radarPulseDot} />
            <Text style={styles.eyebrowText}>RED PEDIÁTRICA EN VIVO</Text>
          </View>
          <Text style={styles.titleText}>Pediatras Cerca de tu Zona</Text>
        </View>
        <View style={styles.badgeNearCount}>
          <Ionicons name="location" size={14} color={TC.accent} />
          <Text style={styles.badgeNearCountText}>4 en tu radio</Text>
        </View>
      </View>

      {/* ── Mapa Interactivo Simulado (Vectorial SVG) ── */}
      <View style={styles.mapCard}>
        <Svg
          width="100%"
          height={230}
          viewBox="0 0 360 230"
          style={styles.mapSvg}
        >
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#EBF4F6" />
              <Stop offset="1" stopColor="#DFEDF2" />
            </LinearGradient>
            <LinearGradient id="radarWaveGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={TC.accent} stopOpacity="0.25" />
              <Stop offset="1" stopColor={TC.accent} stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#CDE4F5" />
              <Stop offset="1" stopColor="#BBDDF3" />
            </LinearGradient>
          </Defs>

          {/* Fondo del mapa tipo terreno */}
          <Rect x="0" y="0" width="360" height="230" fill="url(#bgGrad)" />

          {/* Zonas verdes / Parques */}
          <Path
            d="M 10 10 Q 50 2 80 20 T 110 70 T 30 90 Z"
            fill="#D5EBD9"
            opacity="0.8"
          />
          <Path
            d="M 260 140 Q 310 120 350 150 T 340 220 T 250 210 Z"
            fill="#D5EBD9"
            opacity="0.75"
          />

          {/* Río / Canal estilizado */}
          <Path
            d="M -10 170 Q 90 150 170 180 T 370 160"
            stroke="url(#riverGrad)"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />

          {/* Calles secundarias */}
          <Path
            d="M 40 0 L 40 230 M 110 0 L 110 230 M 230 0 L 230 230 M 310 0 L 310 230"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            opacity="0.9"
          />
          <Path
            d="M 0 50 L 360 50 M 0 115 L 360 115 M 0 180 L 360 180"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            opacity="0.9"
          />

          {/* Avenidas principales con borde */}
          <Path
            d="M 0 90 Q 140 100 180 80 T 360 70"
            stroke="#CBD5E1"
            strokeWidth="7"
            fill="none"
          />
          <Path
            d="M 0 90 Q 140 100 180 80 T 360 70"
            stroke="#FFFFFF"
            strokeWidth="5"
            fill="none"
          />

          <Path
            d="M 180 0 L 180 230"
            stroke="#CBD5E1"
            strokeWidth="7"
            fill="none"
          />
          <Path
            d="M 180 0 L 180 230"
            stroke="#FFFFFF"
            strokeWidth="5"
            fill="none"
          />

          {/* Cuadrículas de bloques urbanos (decorativo) */}
          <Rect
            x="55"
            y="15"
            width="40"
            height="25"
            rx="3"
            fill="#E2E8F0"
            opacity="0.4"
          />
          <Rect
            x="125"
            y="15"
            width="40"
            height="25"
            rx="3"
            fill="#E2E8F0"
            opacity="0.4"
          />
          <Rect
            x="245"
            y="65"
            width="50"
            height="35"
            rx="3"
            fill="#E2E8F0"
            opacity="0.4"
          />
          <Rect
            x="55"
            y="130"
            width="40"
            height="35"
            rx="3"
            fill="#E2E8F0"
            opacity="0.4"
          />

          {/* Ondas concéntricas de radar desde la ubicación del usuario (180, 115) */}
          <Circle
            cx="180"
            cy="115"
            r="45"
            stroke={TC.accent}
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.4"
            fill="none"
          />
          <Circle
            cx="180"
            cy="115"
            r="85"
            stroke={TC.accent}
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.25"
            fill="none"
          />
          <Circle
            cx="180"
            cy="115"
            r="130"
            stroke={TC.accent}
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.15"
            fill="none"
          />

          {/* Marcador del Usuario / Hogar */}
          <G x="180" y="115">
            <Circle r="16" fill={TC.accent + "33"} />
            <Circle r="8" fill="#FFFFFF" />
            <Circle r="5.5" fill={TC.accent} />
          </G>

          {/* Etiqueta de "Tu Ubicación" */}
          <Rect
            x="150"
            y="128"
            width="60"
            height="18"
            rx="9"
            fill="#1E293B"
            opacity="0.85"
          />
          <SvgText
            x="180"
            y="140"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            Tu Hogar
          </SvgText>

          {/* Conexión de radar hacia el doctor seleccionado */}
          {selectedDoc && (
            <Line
              x1="180"
              y1="115"
              x2={(selectedDoc.coords.x / 100) * 360}
              y2={(selectedDoc.coords.y / 100) * 230}
              stroke={TC.accent}
              strokeWidth="2"
              strokeDasharray="4,3"
              opacity="0.7"
            />
          )}

          {/* Pins de Pediatras renderizados en el mapa SVG */}
          {pediatricians.map((doc) => {
            const px = (doc.coords.x / 100) * 360;
            const py = (doc.coords.y / 100) * 230;
            const isSelected = doc.id === selectedPedId;
            const isLinked = doc.status === "vinculado";
            const isEval = doc.status === "evaluando";

            const pinColor = isLinked
              ? "#10B981"
              : isEval
                ? "#F59E0B"
                : isSelected
                  ? TC.accent
                  : "#3B82F6";

            return (
              <G key={doc.id} x={px} y={py}>
                {isSelected && <Circle r="22" fill={pinColor + "33"} />}
                {/* Pin base */}
                <Circle
                  r={isSelected ? 16 : 13}
                  fill="#FFFFFF"
                  stroke={pinColor}
                  strokeWidth="2.5"
                />
                <Circle r={isSelected ? 13 : 10} fill={pinColor} />
                <SvgText
                  x="0"
                  y="4"
                  fill="#FFFFFF"
                  fontSize={isSelected ? "10" : "8"}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {doc.avatarInitial}
                </SvgText>

                {/* Tooltip de distancia sobre el pin */}
                <Rect
                  x="-22"
                  y={isSelected ? -34 : -28}
                  width="44"
                  height="16"
                  rx="8"
                  fill="#1E293B"
                  opacity="0.9"
                />
                <SvgText
                  x="0"
                  y={isSelected ? -23 : -17}
                  fill="#FFFFFF"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {doc.distanceKm} km
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Overlay interactivo para tocar directamente en el mapa los pines */}
        {pediatricians.map((doc) => {
          const isSelected = doc.id === selectedPedId;
          return (
            <TouchableOpacity
              key={`touch-${doc.id}`}
              style={[
                styles.mapPinTouchable,
                {
                  left: `${doc.coords.x}%`,
                  top: `${doc.coords.y}%`,
                  transform: [{ translateX: -24 }, { translateY: -24 }],
                },
              ]}
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic("light");
                setSelectedPedId(doc.id);
              }}
              accessibilityLabel={`Pediatra ${doc.name}`}
            >
              <View style={isSelected ? styles.pinHighlightHalo : null} />
            </TouchableOpacity>
          );
        })}

        {/* Leyenda flotante en la esquina inferior del mapa */}
        <View style={styles.mapFloatingBar}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TC.accent }]} />
            <Text style={styles.legendText}>Tú</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
            <Text style={styles.legendText}>Disponible</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={styles.legendText}>En Evaluación</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.legendText}>Vinculado</Text>
          </View>
        </View>
      </View>

      {/* ── Filtros Rápidos ── */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterSpecialty === "all" && styles.filterChipActive,
          ]}
          onPress={() => {
            triggerHaptic("light");
            setFilterSpecialty("all");
          }}
        >
          <Text
            style={[
              styles.filterChipText,
              filterSpecialty === "all" && styles.filterChipTextActive,
            ]}
          >
            Todos ({pediatricians.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filterSpecialty === "linked" && styles.filterChipActive,
          ]}
          onPress={() => {
            triggerHaptic("light");
            setFilterSpecialty("linked");
          }}
        >
          <Ionicons
            name="checkmark-circle"
            size={13}
            color={filterSpecialty === "linked" ? "#FFF" : "#10B981"}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.filterChipText,
              filterSpecialty === "linked" && styles.filterChipTextActive,
            ]}
          >
            Vinculados (
            {pediatricians.filter((p) => p.status === "vinculado").length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filterSpecialty === "eval" && styles.filterChipActive,
          ]}
          onPress={() => {
            triggerHaptic("light");
            setFilterSpecialty("eval");
          }}
        >
          <Ionicons
            name="hourglass-outline"
            size={13}
            color={filterSpecialty === "eval" ? "#FFF" : "#F59E0B"}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.filterChipText,
              filterSpecialty === "eval" && styles.filterChipTextActive,
            ]}
          >
            En Revisión (
            {pediatricians.filter((p) => p.status === "evaluando").length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tarjetas de Pediatras ── */}
      <View style={styles.cardsList}>
        {filteredPediatricians.map((doc) => {
          const isSelected = doc.id === selectedPedId;
          const isLinked = doc.status === "vinculado";
          const isEval = doc.status === "evaluando";

          return (
            <TouchableOpacity
              key={doc.id}
              activeOpacity={0.9}
              onPress={() => {
                triggerHaptic("light");
                setSelectedPedId(doc.id);
              }}
              style={[
                styles.docCard,
                isSelected && styles.docCardSelected,
                isLinked && styles.docCardLinkedBorder,
              ]}
            >
              {/* Encabezado del Pediatra */}
              <View style={styles.docHeader}>
                <View
                  style={[styles.avatarBox, isLinked && styles.avatarBoxLinked]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      isLinked && styles.avatarTextLinked,
                    ]}
                  >
                    {doc.avatarInitial}
                  </Text>
                  {isLinked && (
                    <View style={styles.avatarCheckBadge}>
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    </View>
                  )}
                </View>

                <View style={styles.docInfo}>
                  <View style={styles.docNameRow}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    {/* Badge de Estado */}
                    {isLinked ? (
                      <View style={styles.statusBadgeLinked}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#065F46"
                        />
                        <Text style={styles.statusTextLinked}>Vinculado</Text>
                      </View>
                    ) : isEval ? (
                      <View style={styles.statusBadgeEval}>
                        <Ionicons name="time" size={12} color="#92400E" />
                        <Text style={styles.statusTextEval}>En Evaluación</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgeAvailable}>
                        <Text style={styles.statusTextAvailable}>
                          Disponible
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.docSpecialty}>{doc.specialty}</Text>
                  <Text style={styles.docClinic} numberOfLines={1}>
                    {doc.clinic}
                  </Text>

                  {/* Rating y Distancia */}
                  <View style={styles.metaRow}>
                    <View style={styles.ratingBox}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingVal}>
                        {doc.rating.toFixed(1)}
                      </Text>
                      <Text style={styles.reviewsCount}>
                        ({doc.reviewsCount})
                      </Text>
                    </View>
                    <Text style={styles.metaDivider}>•</Text>
                    <View style={styles.distanceBox}>
                      <Ionicons
                        name="navigate-outline"
                        size={12}
                        color={TC.textMuted}
                      />
                      <Text style={styles.distanceText}>
                        {doc.distanceKm} km
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ── Estado Informativo & Acciones del Flujo ── */}
              {isLinked ? (
                /* Estado 3: VINCULADO - Puede enviar reportes medidos y contactar */
                <View style={styles.actionSectionLinked}>
                  <View style={styles.linkedNoticeBox}>
                    <Ionicons
                      name="shield-checkmark"
                      size={16}
                      color="#10B981"
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.linkedNoticeTitle}>
                        Médico de Cabecera Asignado
                      </Text>
                      <Text style={styles.linkedNoticeDesc}>
                        {doc.lastReportSentDate
                          ? `Último reporte telemétrico: ${doc.lastReportSentDate}`
                          : "Listo para recibir telemetría y consultas directas."}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.buttonActionRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.btnSendReport}
                      onPress={() => {
                        triggerHaptic("medium");
                        setModalSendReportDoc(doc);
                      }}
                    >
                      <Ionicons
                        name="document-text"
                        size={16}
                        color="#FFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.btnSendReportText}>
                        Enviar Reporte Telemétrico
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.btnCall}
                      onPress={() => handleCallDoctor(doc.phone, doc.name)}
                      accessibilityLabel={`Contactar al doctor ${doc.name}`}
                    >
                      <Ionicons name="call" size={16} color={TC.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isEval ? (
                /* Estado 2: EN EVALUACIÓN - El pediatra revisa el expediente */
                <View style={styles.actionSectionEval}>
                  <View style={styles.evalNoticeBox}>
                    <Ionicons name="hourglass" size={16} color="#D97706" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.evalNoticeTitle}>
                        Solicitud en Revisión Médica
                      </Text>
                      <Text style={styles.evalNoticeDesc}>
                        {doc.name} está evaluando la ficha de {patientName}.
                        Recibirás notificación al aprobarse.
                      </Text>
                      {doc.consultationReason && (
                        <Text style={styles.evalReasonText}>
                          Motivo: {doc.consultationReason}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Botón de Simulación para Demostración */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.btnSimulateApproval}
                    onPress={() => handleSimulateApproval(doc.id)}
                  >
                    <Ionicons
                      name="flash"
                      size={14}
                      color="#B45309"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.btnSimulateText}>
                      Simular Aprobación del Médico
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Estado 1: DISPONIBLE - Solicitar vinculación */
                <View style={styles.actionSectionAvailable}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.btnRequest}
                    onPress={() => {
                      triggerHaptic("medium");
                      setModalRequestDoc(doc);
                    }}
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={16}
                      color={TC.accent}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.btnRequestText}>
                      Solicitar Vinculación Médica
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Modal 1: Solicitar Vinculación Médica ── */}
      <Modal
        visible={!!modalRequestDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRequestDoc(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBadge}>
                <Ionicons name="medical" size={20} color={TC.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Solicitud de Vinculación</Text>
                <Text style={styles.modalSubtitle}>
                  {modalRequestDoc?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalRequestDoc(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={TC.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalBody}
            >
              <View style={styles.patientPreviewCard}>
                <Text style={styles.patientPreviewKicker}>
                  PACIENTE A VINCULAR
                </Text>
                <Text style={styles.patientPreviewName}>{patientName}</Text>
                <Text style={styles.patientPreviewDesc}>
                  Se compartirá de forma privada el expediente clínico
                  telemétrico y las alertas preventivas.
                </Text>
              </View>

              <Text style={styles.inputSectionLabel}>
                Motivo de la Vinculación Médica
              </Text>
              <View style={styles.reasonsList}>
                {CONSULTATION_REASONS.map((r, i) => {
                  const isPicked = requestReason === r;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      style={[
                        styles.reasonOption,
                        isPicked && styles.reasonOptionActive,
                      ]}
                      onPress={() => {
                        triggerHaptic("light");
                        setRequestReason(r);
                      }}
                    >
                      <Ionicons
                        name={isPicked ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={isPicked ? TC.accent : TC.textMuted}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.reasonOptionText,
                          isPicked && styles.reasonOptionTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputSectionLabel}>
                Nota para el Pediatra (Opcional)
              </Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Ej. Bebé de 2 meses, presentó elevaciones en FC nocturna..."
                placeholderTextColor={TC.textMuted}
                value={requestNote}
                onChangeText={setRequestNote}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setModalRequestDoc(null)}
              >
                <Text style={styles.btnModalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnModalSubmit,
                  isSubmittingRequest && { opacity: 0.6 },
                ]}
                onPress={handleConfirmRequest}
                disabled={isSubmittingRequest}
              >
                <Text style={styles.btnModalSubmitText}>
                  {isSubmittingRequest ? "Enviando..." : "Enviar Solicitud"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal 2: Enviar Reporte Telemétrico al Pediatra ── */}
      <Modal
        visible={!!modalSendReportDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setModalSendReportDoc(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View
                style={[styles.modalIconBadge, { backgroundColor: "#ECFDF5" }]}
              >
                <Ionicons name="send" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Enviar Reporte Telemétrico
                </Text>
                <Text style={styles.modalSubtitle}>
                  Destino: {modalSendReportDoc?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalSendReportDoc(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={TC.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalBody}
            >
              <View style={styles.reportSummaryCard}>
                <View style={styles.reportSummaryRow}>
                  <Text style={styles.reportSummaryLabel}>Paciente:</Text>
                  <Text style={styles.reportSummaryVal}>{patientName}</Text>
                </View>
                <View style={styles.reportSummaryRow}>
                  <Text style={styles.reportSummaryLabel}>Periodo:</Text>
                  <Text style={styles.reportSummaryVal}>
                    {period === "24H" ? "Últimas 24 Horas" : "Últimos 7 Días"}
                  </Text>
                </View>
                <View style={styles.reportSummaryRow}>
                  <Text style={styles.reportSummaryLabel}>Biomarcadores:</Text>
                  <Text style={styles.reportSummaryVal}>
                    FC, SpO2, Temp, Postura
                  </Text>
                </View>
              </View>

              <Text style={styles.inputSectionLabel}>
                Observaciones para la Consulta (Opcional)
              </Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Describe síntomas o dudas sobre los signos medidos..."
                placeholderTextColor={TC.textMuted}
                value={reportNote}
                onChangeText={setReportNote}
                multiline
                numberOfLines={3}
                maxLength={200}
              />

              <View style={styles.reportSecurityNotice}>
                <Ionicons name="lock-closed" size={14} color="#059669" />
                <Text style={styles.reportSecurityNoticeText}>
                  Transmisión segura y cifrada directa al expediente médico en
                  TinyCare Cloud.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setModalSendReportDoc(null)}
              >
                <Text style={styles.btnModalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnModalSubmitLinked,
                  isSendingReport && { opacity: 0.6 },
                ]}
                onPress={handleConfirmSendReport}
                disabled={isSendingReport}
              >
                <Ionicons
                  name="paper-plane"
                  size={16}
                  color="#FFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.btnModalSubmitText}>
                  {isSendingReport ? "Transmitiendo..." : "Transmitir Reporte"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  backButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: TC.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    marginBottom: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: TC.textDark,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  radarPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: TC.accent,
    marginRight: 6,
  },
  eyebrowText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: TC.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
  },
  badgeNearCount: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TC.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  badgeNearCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: TC.accent,
  },

  /* Mapa */
  mapCard: {
    backgroundColor: "#DFEDF2",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(20, 184, 166, 0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: "relative",
  },
  mapSvg: {
    borderRadius: 22,
  },
  mapPinTouchable: {
    position: "absolute",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  pinHighlightHalo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: TC.accent,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
  },
  mapFloatingBar: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: TC.textDark,
  },

  /* Filtros */
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: TC.card,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  filterChipActive: {
    backgroundColor: TC.accent,
    borderColor: TC.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: TC.textBody,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },

  /* Tarjetas */
  cardsList: {
    gap: 12,
  },
  docCard: {
    backgroundColor: TC.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  docCardSelected: {
    borderColor: TC.accent,
    shadowColor: TC.accent,
    shadowOpacity: 0.15,
  },
  docCardLinkedBorder: {
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  docHeader: {
    flexDirection: "row",
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TC.trackBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    position: "relative",
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  avatarBoxLinked: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: TC.textDark,
  },
  avatarTextLinked: {
    color: "#059669",
  },
  avatarCheckBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  docInfo: {
    flex: 1,
  },
  docNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  docName: {
    fontSize: 15,
    fontWeight: "800",
    color: TC.textDark,
    flex: 1,
  },
  docSpecialty: {
    fontSize: 12,
    fontWeight: "700",
    color: TC.accent,
    marginTop: 1,
  },
  docClinic: {
    fontSize: 11.5,
    color: TC.textMuted,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 6,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: "800",
    color: TC.textDark,
  },
  reviewsCount: {
    fontSize: 11,
    color: TC.textMuted,
  },
  metaDivider: {
    color: TC.textMuted,
    fontSize: 10,
  },
  distanceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  distanceText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: TC.textMuted,
  },

  /* Badges */
  statusBadgeAvailable: {
    backgroundColor: TC.trackBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusTextAvailable: {
    fontSize: 10.5,
    fontWeight: "700",
    color: TC.textMuted,
  },
  statusBadgeEval: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusTextEval: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#92400E",
  },
  statusBadgeLinked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusTextLinked: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#065F46",
  },

  /* Secciones de acción por estado */
  actionSectionAvailable: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: TC.borderLight,
  },
  btnRequest: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TC.accentLight,
    paddingVertical: 10,
    borderRadius: 14,
  },
  btnRequestText: {
    fontSize: 13,
    fontWeight: "800",
    color: TC.accent,
  },

  actionSectionEval: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: TC.borderLight,
    gap: 8,
  },
  evalNoticeBox: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  evalNoticeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  evalNoticeDesc: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 15,
  },
  evalReasonText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#78350F",
    marginTop: 4,
  },
  btnSimulateApproval: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  btnSimulateText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#92400E",
  },

  actionSectionLinked: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: TC.borderLight,
    gap: 8,
  },
  linkedNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  linkedNoticeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
  },
  linkedNoticeDesc: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 1,
  },
  buttonActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnSendReport: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  btnSendReportText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnCall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: TC.accentLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
  },

  /* Modales */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: TC.card,
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: TC.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: TC.textDark,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: TC.textMuted,
    fontWeight: "600",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 16,
  },
  patientPreviewCard: {
    backgroundColor: TC.trackBg,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  patientPreviewKicker: {
    fontSize: 10,
    fontWeight: "800",
    color: TC.textMuted,
    letterSpacing: 1,
  },
  patientPreviewName: {
    fontSize: 15,
    fontWeight: "800",
    color: TC.textDark,
    marginTop: 2,
  },
  patientPreviewDesc: {
    fontSize: 11.5,
    color: TC.textBody,
    marginTop: 4,
    lineHeight: 16,
  },
  inputSectionLabel: {
    fontSize: 12.5,
    fontWeight: "800",
    color: TC.textDark,
    marginBottom: 8,
    marginTop: 4,
  },
  reasonsList: {
    gap: 8,
    marginBottom: 14,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: TC.inputBg,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  reasonOptionActive: {
    backgroundColor: TC.accentLight,
    borderColor: TC.accent,
  },
  reasonOptionText: {
    fontSize: 12,
    color: TC.textBody,
    flex: 1,
    fontWeight: "600",
  },
  reasonOptionTextActive: {
    color: TC.accent,
    fontWeight: "800",
  },
  modalTextInput: {
    backgroundColor: TC.inputBg,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderRadius: 14,
    padding: 12,
    fontSize: 12.5,
    color: TC.textDark,
    textAlignVertical: "top",
    minHeight: 70,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
  },
  btnModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: TC.trackBg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnModalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: TC.textBody,
  },
  btnModalSubmit: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: TC.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnModalSubmitLinked: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  btnModalSubmitText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  reportSummaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    gap: 6,
    marginBottom: 14,
  },
  reportSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reportSummaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: TC.textMuted,
  },
  reportSummaryVal: {
    fontSize: 12,
    fontWeight: "800",
    color: TC.textDark,
  },
  reportSecurityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  reportSecurityNoticeText: {
    fontSize: 11,
    color: "#065F46",
    flex: 1,
    fontWeight: "600",
  },
});
