import { Ionicons } from "@expo/vector-icons";
import * as MailComposer from "expo-mail-composer";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TC } from "../components/theme";
import { database } from "../src/database";
import {
  AlertaMedica,
  DatosPersonales,
  Dispositivo,
  Emergencia,
  Perfil,
  SaludContexto,
} from "../src/database/models";

// ─── Helper ──────────────────────────────────────────────────────────────────

function calcEdad(fechaMs: number): string {
  const hoy = new Date();
  const nac = new Date(fechaMs);
  const diffMs = hoy.getTime() - nac.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dias < 30) return `${dias} día${dias !== 1 ? "s" : ""}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} mes${meses !== 1 ? "es" : ""}`;
  const anos = Math.floor(meses / 12);
  const mesesRest = meses % 12;
  return `${anos} año${anos !== 1 ? "s" : ""}${mesesRest > 0 ? ` y ${mesesRest} mes${mesesRest !== 1 ? "es" : ""}` : ""}`;
}

function formatFecha(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Section Component ────────────────────────────────────────────────────────

const ReportSection = ({
  icon,
  title,
  color = TC.accent,
  children,
}: {
  icon: any;
  title: string;
  color?: string;
  children: React.ReactNode;
}) => (
  <View style={rs.section}>
    <View style={rs.sectionHeader}>
      <View style={[rs.iconBadge, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={rs.sectionTitle}>{title}</Text>
    </View>
    <View style={rs.sectionBody}>{children}</View>
  </View>
);

const DataRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <View style={rs.dataRow}>
    <Text style={rs.dataLabel}>{label}</Text>
    <Text style={[rs.dataValue, highlight && { color: TC.accent, fontWeight: "800" }]}>{value}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DoctorReportScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Data states
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [datos, setDatos] = useState<DatosPersonales | null>(null);
  const [salud, setSalud] = useState<SaludContexto | null>(null);
  const [alertas, setAlertas] = useState<AlertaMedica[]>([]);
  const [emergencias, setEmergencias] = useState<Emergencia[]>([]);
  const [dispositivo, setDispositivo] = useState<Dispositivo | null>(null);

  useEffect(() => {
    if (!id) {
      Alert.alert("Error", "No se especificó un perfil.");
      router.back();
      return;
    }
    loadData(id);
  }, [id]);

  const loadData = async (perfilId: string) => {
    try {
      const p = await database.get<Perfil>("perfiles").find(perfilId);
      setPerfil(p);

      const dpAll = await database.get<DatosPersonales>("datos_personales").query().fetch();
      setDatos(dpAll.find((r) => r.idPerfil === perfilId) || null);

      const scAll = await database.get<SaludContexto>("salud_contexto").query().fetch();
      setSalud(scAll.find((r) => r.idPerfil === perfilId) || null);

      const al = await database.get<AlertaMedica>("alertas_medicas").query().fetch();
      const recent = al
        .filter((a) => a.idPerfil === perfilId)
        .sort((a, b) => b.timestampEvento - a.timestampEvento)
        .slice(0, 8);
      setAlertas(recent);

      const emAll = await database.get<Emergencia>("emergencias").query().fetch();
      setEmergencias(emAll.filter((e) => e.idPerfil === perfilId));

      const devAll = await database.get<Dispositivo>("dispositivos").query().fetch();
      setDispositivo(devAll.find((d) => d.idPerfil === perfilId) || null);

      setLoading(false);
    } catch (e) {
      console.error("[DoctorReport] loadData:", e);
      Alert.alert("Error", "No se pudieron cargar los datos del perfil.");
      router.back();
    }
  };

  // ── Build Report Text ────────────────────────────────────────────────────
  const buildReportText = (): string => {
    const nombreCompleto = datos
      ? `${datos.primerNombre || ""} ${datos.segundoNombre || ""} ${datos.apellidoPaterno || ""} ${datos.apellidoMaterno || ""}`.trim()
      : perfil?.nombreIdentificador || "Sin nombre";

    const fechaNacStr = datos?.fechaNacimiento
      ? formatFecha(datos.fechaNacimiento)
      : "No registrada";

    const edadStr = datos?.fechaNacimiento
      ? calcEdad(datos.fechaNacimiento)
      : "Desconocida";

    const sangre = salud?.grupoSanguineo
      ? `${salud.grupoSanguineo} ${salud.factorRh || ""}`
      : "No registrado";

    const pesoStr = salud?.pesoKg ? `${salud.pesoKg} kg` : "No registrado";
    const tallaStr = salud?.tallaCm ? `${salud.tallaCm} cm` : "No registrada";

    const alergias = salud?.tieneAlergias
      ? `Sí — ${salud.detallesAlergias || "Sin detalles"}`
      : "No";

    const complicaciones = salud?.tieneComplicaciones
      ? `Sí — ${salud.detallesComplicaciones || "Sin detalles"}`
      : "No";

    const alertasText =
      alertas.length > 0
        ? alertas
            .map(
              (a) =>
                `  • [${a.nivel}] ${a.tipoAlerta}: ${a.valorRegistrado} — ${formatFecha(a.timestampEvento)}`
            )
            .join("\n")
        : "  Sin alertas recientes registradas.";

    const dispositivoText = dispositivo
      ? `${dispositivo.nombre} (${dispositivo.identificadorHardware}) — Estado: ${dispositivo.estado}`
      : "Sin monitor vinculado";

    const genFecha = new Date().toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return `
══════════════════════════════════════════
   REPORTE CLÍNICO PEDIÁTRICO — TinyCare
══════════════════════════════════════════
Generado: ${genFecha}
Sistema: TinyCare — Monitor Neonatal Inteligente

──────────────────────────────────────────
  DATOS DEL PACIENTE
──────────────────────────────────────────
Nombre completo:   ${nombreCompleto}
Apodo/ID:          ${perfil?.nombreIdentificador || "—"}
Sexo:              ${datos?.sexo || "No especificado"}
Fecha de nac.:     ${fechaNacStr}
Edad actual:       ${edadStr}

──────────────────────────────────────────
  DATOS CLÍNICOS
──────────────────────────────────────────
Grupo sanguíneo:   ${sangre}
Peso:              ${pesoStr}
Talla:             ${tallaStr}
Prematuro:         ${salud?.esPrematuro ? "Sí" : "No"}
${salud?.esPrematuro && salud?.edadGestacionalSemanas ? `Ed. gestacional:   ${salud.edadGestacionalSemanas} semanas\n` : ""}
──────────────────────────────────────────
  ANTECEDENTES MÉDICOS
──────────────────────────────────────────
Alergias:          ${alergias}
Complicaciones:    ${complicaciones}
Alto riesgo SDR:   ${salud?.altoRiesgoSdr ? "Sí" : "No"}
Sosp. cardiopatía: ${salud?.sospechaCardiopatia ? "Sí" : "No"}

──────────────────────────────────────────
  ALERTAS RECIENTES (últimas 8)
──────────────────────────────────────────
${alertasText}

──────────────────────────────────────────
  DISPOSITIVO DE MONITOREO
──────────────────────────────────────────
${dispositivoText}

──────────────────────────────────────────
  NOTA MÉDICA
──────────────────────────────────────────
Este reporte fue generado automáticamente por la
aplicación TinyCare. Los datos biométricos son
referenciales y deben ser interpretados por un
profesional de la salud.

TinyCare — InnovaTecNM © 2026
══════════════════════════════════════════
`.trim();
  };

  const handleSendEmail = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Sin cliente de correo",
        "No se encontró una aplicación de correo configurada en este dispositivo. Configura una cuenta de correo e intenta de nuevo."
      );
      return;
    }

    setSending(true);
    const reportText = buildReportText();
    const nombreBebe =
      datos
        ? `${datos.primerNombre || ""} ${datos.apellidoPaterno || ""}`.trim()
        : perfil?.nombreIdentificador || "Paciente";

    try {
      const result = await MailComposer.composeAsync({
        subject: `Reporte Clínico Pediátrico — ${nombreBebe} — TinyCare`,
        body: reportText,
        isHtml: false,
      });

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert("✅ Enviado", "El reporte fue enviado correctamente.");
      }
    } catch (e) {
      console.error("[DoctorReport] sendEmail:", e);
      Alert.alert("Error", "No se pudo abrir el cliente de correo.");
    } finally {
      setSending(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[rs.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={TC.accent} />
        <Text style={{ marginTop: 12, color: TC.textMuted, fontWeight: "600" }}>
          Generando reporte...
        </Text>
      </View>
    );
  }

  const nombreCompleto = datos
    ? `${datos.primerNombre || ""} ${datos.segundoNombre || ""} ${datos.apellidoPaterno || ""} ${datos.apellidoMaterno || ""}`.trim()
    : perfil?.nombreIdentificador || "Sin nombre";

  const edadStr = datos?.fechaNacimiento
    ? calcEdad(datos.fechaNacimiento)
    : "Desconocida";

  const alertasCriticas = alertas.filter((a) => a.nivel === "Critico");
  const alertasAdvertencia = alertas.filter((a) => a.nivel === "Advertencia");

  return (
    <View style={[rs.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={rs.header}>
        <TouchableOpacity onPress={() => router.back()} style={rs.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TC.textDark} />
        </TouchableOpacity>
        <View style={rs.headerCenter}>
          <Text style={rs.headerLabel}>EXPEDIENTE MÉDICO</Text>
          <Text style={rs.headerTitle}>Reporte Pediátrico</Text>
        </View>
        <TouchableOpacity
          style={[rs.sendBtn, sending && { opacity: 0.6 }]}
          activeOpacity={0.7}
          onPress={handleSendEmail}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="mail" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={rs.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Patient Summary Card ── */}
        <View style={rs.summaryCard}>
          <View style={rs.summaryAvatarBox}>
            <Text style={rs.summaryAvatar}>{perfil?.avatar || "👶"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rs.summaryName}>{nombreCompleto}</Text>
            <Text style={rs.summaryAge}>Edad: {edadStr}</Text>
            {datos?.fechaNacimiento ? (
              <Text style={rs.summaryDate}>
                Nacimiento: {formatFecha(datos.fechaNacimiento)}
              </Text>
            ) : null}
          </View>
          <View style={rs.summaryBadge}>
            <Ionicons name="document-text" size={20} color={TC.accent} />
          </View>
        </View>

        {/* ── Alert Summary ── */}
        {alertasCriticas.length > 0 && (
          <View style={[rs.alertBanner, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}>
            <Ionicons name="warning" size={18} color="#EF4444" />
            <Text style={[rs.alertBannerText, { color: "#B91C1C" }]}>
              {alertasCriticas.length} alerta{alertasCriticas.length > 1 ? "s" : ""} crítica{alertasCriticas.length > 1 ? "s" : ""} en las últimas 24h
            </Text>
          </View>
        )}
        {alertasAdvertencia.length > 0 && alertasCriticas.length === 0 && (
          <View style={[rs.alertBanner, { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }]}>
            <Ionicons name="alert-circle" size={18} color="#D97706" />
            <Text style={[rs.alertBannerText, { color: "#92400E" }]}>
              {alertasAdvertencia.length} advertencia{alertasAdvertencia.length > 1 ? "s" : ""} reciente{alertasAdvertencia.length > 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {/* ── Data Sections ── */}
        <ReportSection icon="person" title="Identificación" color={TC.accent}>
          <DataRow label="Nombre completo" value={nombreCompleto} />
          <DataRow label="Sexo" value={datos?.sexo || "No especificado"} />
          <DataRow
            label="Fecha de nacimiento"
            value={datos?.fechaNacimiento ? formatFecha(datos.fechaNacimiento) : "No registrada"}
          />
          <DataRow label="Edad" value={edadStr} highlight />
        </ReportSection>

        <ReportSection icon="fitness" title="Datos Clínicos" color={TC.vitalOxygen}>
          <DataRow
            label="Grupo sanguíneo"
            value={salud?.grupoSanguineo ? `${salud.grupoSanguineo} ${salud.factorRh || ""}` : "No registrado"}
          />
          <DataRow label="Peso" value={salud?.pesoKg ? `${salud.pesoKg} kg` : "No registrado"} />
          <DataRow label="Talla" value={salud?.tallaCm ? `${salud.tallaCm} cm` : "No registrada"} />
          <DataRow label="Prematuro" value={salud?.esPrematuro ? "Sí" : "No"} />
          {salud?.esPrematuro && salud?.edadGestacionalSemanas ? (
            <DataRow label="Ed. gestacional" value={`${salud.edadGestacionalSemanas} semanas`} />
          ) : null}
        </ReportSection>

        <ReportSection icon="medkit" title="Antecedentes Médicos" color={TC.vitalTemp}>
          <DataRow
            label="Alergias"
            value={salud?.tieneAlergias ? "Sí" : "No"}
            highlight={salud?.tieneAlergias}
          />
          {salud?.tieneAlergias && salud.detallesAlergias ? (
            <View style={rs.detailBox}>
              <Text style={rs.detailText}>{salud.detallesAlergias}</Text>
            </View>
          ) : null}
          <DataRow
            label="Complicaciones"
            value={salud?.tieneComplicaciones ? "Sí" : "No"}
            highlight={salud?.tieneComplicaciones}
          />
          {salud?.tieneComplicaciones && salud.detallesComplicaciones ? (
            <View style={rs.detailBox}>
              <Text style={rs.detailText}>{salud.detallesComplicaciones}</Text>
            </View>
          ) : null}
          <DataRow label="Alto riesgo SDR" value={salud?.altoRiesgoSdr ? "Sí" : "No"} />
          <DataRow label="Sosp. cardiopatía" value={salud?.sospechaCardiopatia ? "Sí" : "No"} />
        </ReportSection>

        <ReportSection icon="notifications" title="Alertas Recientes" color={TC.vitalHeart}>
          {alertas.length === 0 ? (
            <Text style={rs.emptyText}>Sin alertas registradas.</Text>
          ) : (
            alertas.map((a, i) => (
              <View
                key={a.id}
                style={[rs.alertRow, i < alertas.length - 1 && rs.alertRowBorder]}
              >
                <View
                  style={[
                    rs.alertDot,
                    {
                      backgroundColor:
                        a.nivel === "Critico"
                          ? "#EF4444"
                          : a.nivel === "Advertencia"
                          ? "#F59E0B"
                          : TC.accent,
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={rs.alertType}>{a.tipoAlerta}</Text>
                  <Text style={rs.alertVal}>{a.valorRegistrado}</Text>
                </View>
                <Text style={rs.alertDate}>{formatFecha(a.timestampEvento)}</Text>
              </View>
            ))
          )}
        </ReportSection>

        <ReportSection icon="bluetooth" title="Dispositivo" color="#6366F1">
          {dispositivo ? (
            <>
              <DataRow label="Nombre" value={dispositivo.nombre} />
              <DataRow label="ID Hardware" value={dispositivo.identificadorHardware} />
              <DataRow label="Estado" value={dispositivo.estado} />
            </>
          ) : (
            <Text style={rs.emptyText}>Sin monitor vinculado.</Text>
          )}
        </ReportSection>

        {/* ── Send Button ── */}
        <TouchableOpacity
          style={[rs.sendFullBtn, sending && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={handleSendEmail}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="mail-outline" size={20} color="#FFF" />
              <Text style={rs.sendFullBtnText}>Enviar al Pediatra</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Legal Notice ── */}
        <View style={rs.legal}>
          <Ionicons name="information-circle-outline" size={16} color={TC.textMuted} />
          <Text style={rs.legalText}>
            Este reporte es generado por TinyCare y es de carácter referencial. Los datos deben ser
            interpretados por un profesional de la salud.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const rs = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TC.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: TC.bg,
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TC.card,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TC.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.3,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TC.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: TC.card,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TC.trackBg,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryAvatar: {
    fontSize: 32,
  },
  summaryName: {
    fontSize: 18,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  summaryAge: {
    fontSize: 14,
    fontWeight: "600",
    color: TC.accent,
    marginBottom: 2,
  },
  summaryDate: {
    fontSize: 13,
    color: TC.textBody,
    fontWeight: "500",
  },
  summaryBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TC.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  alertBannerText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  section: {
    backgroundColor: TC.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    overflow: "hidden",
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.2,
  },
  sectionBody: {
    padding: 16,
    gap: 4,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder + "80",
  },
  dataLabel: {
    fontSize: 14,
    color: TC.textBody,
    fontWeight: "500",
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    color: TC.textDark,
    fontWeight: "700",
    textAlign: "right",
    maxWidth: "55%",
  },
  detailBox: {
    backgroundColor: TC.inputBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  detailText: {
    fontSize: 13,
    color: TC.textBody,
    lineHeight: 20,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  alertRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  alertType: {
    fontSize: 14,
    fontWeight: "700",
    color: TC.textDark,
    marginBottom: 2,
  },
  alertVal: {
    fontSize: 12,
    color: TC.textBody,
    fontWeight: "500",
  },
  alertDate: {
    fontSize: 11,
    color: TC.textMuted,
    fontWeight: "600",
    textAlign: "right",
  },
  emptyText: {
    fontSize: 14,
    color: TC.textMuted,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 8,
  },
  sendFullBtn: {
    backgroundColor: TC.accent,
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  sendFullBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.2,
  },
  legal: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  legalText: {
    fontSize: 12,
    color: TC.textMuted,
    lineHeight: 18,
    flex: 1,
  },
});
