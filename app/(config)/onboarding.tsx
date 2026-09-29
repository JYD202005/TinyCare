import { useDatabase } from "@/src/database/context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BabyAvatar, BabyAvatarSelector } from "@/components/BabyAvatar";
import ComboDatePicker from "@/components/ComboDatePicker";
import GradientButton from "@/components/GradientButton";
import PillInput from "@/components/PillInput";
import { TC } from "@/components/theme";
import { useToast } from "@/components/Toast";
import { notifyCommon } from "@/src/services/notifications/NotificationService";
import { grupoDesdeDias } from "@/src/utils/evaluadorMedico";

type Sexo = "" | "Femenino" | "Masculino";
type Circuncision = "si" | "no" | "nose";

interface Bebe {
  id: number;
  nombre: string;
  avatar: string;
  sexo: Sexo;
  circuncidado: Circuncision;
  fechaNacimiento: string;
  peso: string;
  pesoNacimiento: string;
  esPrematuro: boolean;
  semanasGestacion: string;
  usaOxigeno: boolean;
  riesgoSDR: boolean;
  sospechaCardiopatia: boolean;
  spo2Basal: string;
  tieneComplicaciones: boolean;
  detallesComplicaciones: string;
  mostrarAvanzado?: boolean;
}

const nuevoBebe = (id: number, avatar: string): Bebe => ({
  id,
  nombre: "",
  avatar,
  sexo: "",
  circuncidado: "nose",
  fechaNacimiento: "",
  peso: "",
  pesoNacimiento: "",
  esPrematuro: false,
  semanasGestacion: "",
  usaOxigeno: false,
  riesgoSDR: false,
  sospechaCardiopatia: false,
  spo2Basal: "",
  tieneComplicaciones: false,
  detallesComplicaciones: "",
  mostrarAvanzado: false,
});

const MS_DIA = 86_400_000;
const LIMITE_EDAD_DIAS = 730; // alcance de la app: 0-24 meses
const PESO_MIN = 0.4;         // mismo rango plausible que usa el evaluador
const PESO_MAX = 20;
const PESO_NAC_MAX = 6.5;
const PESO_NAC_OBLIGATORIO_HASTA_DIAS = 60; // las reglas de pérdida/recuperación de peso dependen de él

/** Acepta "3,4" y "3.4" (el teclado numérico en español suele dar coma). */
const aNumero = (t: string) => parseFloat(t.trim().replace(",", "."));

/** dd/mm/aaaa → Date, o null si es inválida (rechaza 31/02, etc.). */
const parseFecha = (t: string): Date | null => {
  const p = t.split("/");
  if (p.length !== 3) return null;
  const [d, m, y] = p.map(Number);
  const f = new Date(y, m - 1, d);
  if (
    isNaN(f.getTime()) ||
    f.getFullYear() !== y ||
    f.getMonth() !== m - 1 ||
    f.getDate() !== d
  )
    return null;
  return f;
};

const edadEnDias = (t: string): number | null => {
  const f = parseFecha(t);
  return f ? Math.floor((Date.now() - f.getTime()) / MS_DIA) : null;
};

/** Devuelve el mensaje de error del primer dato inválido, o null si todo está bien. */
function validarBebe(b: Bebe, i: number): string | null {
  const n = b.nombre.trim() || `bebé ${i + 1}`;
  if (!b.nombre.trim()) return `Ingresa el nombre del bebé ${i + 1}.`;
  if (!b.sexo) return `Indica el sexo de ${n}: se usa para comparar su crecimiento con la curva correcta.`;

  if (!b.fechaNacimiento.trim()) return `Ingresa la fecha de nacimiento para ${n}.`;
  const fecha = parseFecha(b.fechaNacimiento);
  if (!fecha) return `La fecha de nacimiento de ${n} no es válida.`;
  const dias = Math.floor((Date.now() - fecha.getTime()) / MS_DIA);
  if (dias < 0) return `La fecha de nacimiento para ${n} no puede ser en el futuro.`;
  if (dias > LIMITE_EDAD_DIAS)
    return `TinyCare está diseñada para bebés de 0 a 24 meses; ${n} tiene más edad.`;

  if (!b.peso.trim()) return `Ingresa el peso actual de ${n}.`;
  const peso = aNumero(b.peso);
  if (!(peso >= PESO_MIN && peso <= PESO_MAX))
    return `El peso de ${n} debe estar entre ${PESO_MIN} y ${PESO_MAX} kg.`;

  if (!b.pesoNacimiento.trim()) {
    if (dias <= PESO_NAC_OBLIGATORIO_HASTA_DIAS)
      return `Ingresa el peso al nacer de ${n}: se usa para vigilar la pérdida y recuperación de peso.`;
  } else {
    const pn = aNumero(b.pesoNacimiento);
    if (!(pn >= PESO_MIN && pn <= PESO_NAC_MAX))
      return `El peso al nacer de ${n} debe estar entre ${PESO_MIN} y ${PESO_NAC_MAX} kg.`;
  }

  if (b.esPrematuro) {
    const sem = parseInt(b.semanasGestacion, 10);
    if (!(sem >= 22 && sem <= 36))
      return `Indica las semanas de gestación de ${n} (entre 22 y 36).`;
  }
  if (b.sospechaCardiopatia && b.spo2Basal.trim()) {
    const sp = aNumero(b.spo2Basal);
    if (!(sp >= 60 && sp <= 100))
      return `La SpO2 basal de ${n} debe estar entre 60 y 100 %.`;
  }
  return null;
}

/** Selector de opciones tipo botones (una sola elección). */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmentRow}>
      {options.map((o) => {
        const activo = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segmentBtn, activo && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, activo && styles.segmentTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const DEFAULT_AVATARS = [
  "b-bear",
  "g-bun",
  "b-rocket",
  "g-butterfly",
  "b-cookie",
  "g-crown",
];

export default function Onboarding() {
  const database = useDatabase();
  const { showToast, ToastComponent } = useToast();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [bebes, setBebes] = useState<Bebe[]>([nuevoBebe(1, "b-bear")]);
  const [showAvatarPickerId, setShowAvatarPickerId] = useState<number | null>(
    null,
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const agregarBebe = () => {
    const nextAvatar = DEFAULT_AVATARS[bebes.length % DEFAULT_AVATARS.length];
    setBebes([...bebes, nuevoBebe(Date.now(), nextAvatar)]);
  };

  const quitarBebe = (id: number) => {
    if (bebes.length > 1) {
      setBebes(bebes.filter((b) => b.id !== id));
    }
  };

  const actualizarBebe = (id: number, campo: keyof Bebe, valor: any) => {
    setBebes(bebes.map((b) => (b.id === id ? { ...b, [campo]: valor } : b)));
  };

  const guardarDatos = async () => {
    for (let i = 0; i < bebes.length; i++) {
      const error = validarBebe(bebes[i], i);
      if (error) {
        showToast("warning", error);
        return;
      }
    }

    try {
      const addedNames: string[] = [];

      await database.write(async () => {
        for (const bebe of bebes) {
          if (!bebe.nombre.trim()) continue;
          addedNames.push(bebe.nombre.trim());

          const perfil = await database.get("perfiles").create((p: any) => {
            p.nombreIdentificador = bebe.nombre.trim();
            p.avatar = bebe.avatar;
            p.idUsuarioRemote = "local";
          });

          const fechaParsed = parseFecha(bebe.fechaNacimiento) as Date; // ya validada
          const peso = aNumero(bebe.peso);
          const pesoNac = bebe.pesoNacimiento.trim()
            ? aNumero(bebe.pesoNacimiento)
            : null;

          await database.get("datos_personales").create((d: any) => {
            d.idPerfil = perfil.id;
            d.primerNombre = bebe.nombre.trim();
            d.apellidoPaterno = "";
            d.sexo = bebe.sexo; // 'Femenino' | 'Masculino' (curva OMS por sexo)
            d.fechaNacimiento = fechaParsed.getTime();
            // Solo aplica a varones (riesgo de infección urinaria con fiebre). null = no se sabe
            d.circuncidado =
              bebe.sexo === "Masculino" && bebe.circuncidado !== "nose"
                ? bebe.circuncidado === "si"
                : null;
          });

          const diasDeVida = Math.max(
            0,
            Math.floor((Date.now() - fechaParsed.getTime()) / MS_DIA),
          );
          // Campo legado: el evaluador recalcula la edad desde fecha_nacimiento.
          // 'LactanteMayor' se guarda como 'Nino' mientras el schema no lo admita.
          const g = grupoDesdeDias(diasDeVida);
          const grupoEdad = g === "LactanteMayor" ? "Nino" : g;

          await database.get("salud_contexto").create((s: any) => {
            s.idPerfil = perfil.id;
            s.pesoKg = peso;
            s.pesoNacimientoKg = pesoNac;
            s.esPrematuro = bebe.esPrematuro;
            s.altoRiesgoSdr = bebe.riesgoSDR;
            s.sospechaCardiopatia = bebe.sospechaCardiopatia;
            s.spo2Basal =
              bebe.sospechaCardiopatia && bebe.spo2Basal.trim()
                ? aNumero(bebe.spo2Basal)
                : null;
            // Los objetivos 85-90 % de prematuro aplican solo con oxígeno suplementario
            s.usaOxigenoSuplementario = bebe.esPrematuro && bebe.usaOxigeno;
            s.grupoEdad = grupoEdad;
            s.diasDeVida = diasDeVida;
            s.edadGestacionalSemanas = bebe.esPrematuro
              ? parseInt(bebe.semanasGestacion, 10)
              : null;
            s.tieneComplicaciones = bebe.tieneComplicaciones;
            s.detallesComplicaciones = bebe.detallesComplicaciones.trim();
          });

          // Primer punto del historial de crecimiento (permite tendencia y Z-score después)
          try {
            await database.get("mediciones_crecimiento").create((m: any) => {
              m.idPerfil = perfil.id;
              m.fechaMedicion = Date.now();
              m.pesoKg = peso;
              m.fuente = "manual";
              m.isSynced = false;
            });
          } catch (e) {
            console.warn("[onboarding] mediciones_crecimiento no existe aún (falta schema v3)", e);
          }

          await database.get("alertas_medicas").create((a: any) => {
            a.idPerfil = perfil.id;
            a.tipoAlerta = "Registro Exitoso";
            a.nivel = "Info";
            a.valorRegistrado = "";
            a.mensajeMedico = `Bienvenido. El perfil de ${bebe.nombre.trim()} se ha creado correctamente.`;
            a.timestampEvento = Date.now();
            a.leida = false;
            a.isSynced = false;
          });
        }
      });

      for (const name of addedNames) {
        await notifyCommon(
          "Nuevo bebé registrado",
          `El perfil de ${name} está listo en TinyCare.`,
        );
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando datos iniciales", error);
      showToast("error", "Hubo un error al guardar los datos del bebé.");
    }
  };

  return (
    <View style={styles.root}>
      {ToastComponent}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20 },
          ]}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Image
                source={require("@/assets/logo.jpeg")}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.appName}>TinyCare</Text>
            <Text style={styles.appTagline}>
              Vigilancia Pediátrica Inteligente
            </Text>
          </View>

          {step === 1 ? (
            /* Step 1: Welcome */
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: TC.accent + "15" },
                  ]}
                >
                  <Ionicons name="sparkles" size={18} color={TC.accent} />
                </View>
                <Text style={styles.cardTitle}>¡Bienvenido!</Text>
              </View>

              <Text style={styles.paragraph}>
                El monitor inteligente para los más pequeños. Funciona sin
                conexión, protege tu privacidad y te acompaña sin obligarte a
                crear cuentas molestas.
              </Text>

              <GradientButton
                label="CONFIGURACIÓN RÁPIDA"
                onPress={() => setStep(2)}
                style={styles.mainBtn}
              />
            </View>
          ) : (
            /* Step 2: Form */
            <View style={{ gap: 20 }}>
              <View style={styles.step2Header}>
                <Text style={styles.greeting}>¿A quién vamos a cuidar?</Text>
                <Text style={styles.subtitle}>
                  Necesitamos algunos datos iniciales para calibrar
                  correctamente las alertas médicas de tus bebés.
                </Text>
              </View>

              {bebes.map((bebe, index) => (
                <View key={bebe.id} style={styles.bebeCard}>
                  <View style={styles.bebeHeader}>
                    <Text style={styles.bebeLabel}>BEBÉ {index + 1}</Text>
                    {bebes.length > 1 && (
                      <TouchableOpacity
                        onPress={() => quitarBebe(bebe.id)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close" size={18} color={TC.textBody} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Baby Avatar Selector */}
                  <TouchableOpacity
                    onPress={() =>
                      setShowAvatarPickerId(
                        showAvatarPickerId === bebe.id ? null : bebe.id,
                      )
                    }
                    style={[
                      styles.emojiSelectorButton,
                      showAvatarPickerId === bebe.id && {
                        borderColor: TC.accent,
                      },
                    ]}
                  >
                    <BabyAvatar
                      avatar={bebe.avatar}
                      size={44}
                      containerStyle={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emojiLabelTitle}>
                        Avatar del bebé
                      </Text>
                      <Text style={styles.emojiLabelSubtitle}>
                        {showAvatarPickerId === bebe.id
                          ? "Selecciona una ilustración"
                          : "Toca para cambiar avatar"}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        showAvatarPickerId === bebe.id
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                      color={TC.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Avatar Picker Dropdown */}
                  {showAvatarPickerId === bebe.id && (
                    <View style={{ marginTop: 8, marginBottom: 12 }}>
                      <BabyAvatarSelector
                        selectedAvatar={bebe.avatar}
                        onSelectAvatar={(av) => {
                          actualizarBebe(bebe.id, "avatar", av);
                          setShowAvatarPickerId(null);
                        }}
                      />
                    </View>
                  )}

                  <PillInput
                    icon="person-outline"
                    placeholder="Nombre o apodo"
                    value={bebe.nombre}
                    onChangeText={(t) => actualizarBebe(bebe.id, "nombre", t)}
                  />

                  <View>
                    <Text style={styles.fieldLabel}>SEXO</Text>
                    <Segmented<"Femenino" | "Masculino">
                      options={[
                        { label: "Niña", value: "Femenino" },
                        { label: "Niño", value: "Masculino" },
                      ]}
                      value={bebe.sexo}
                      onChange={(v) => actualizarBebe(bebe.id, "sexo", v)}
                    />
                    <Text style={[styles.emojiLabelSubtitle, { marginTop: 6 }]}>
                      Se usa para comparar su crecimiento con la curva correcta.
                    </Text>
                  </View>

                  {bebe.sexo === "Masculino" && (
                    <View>
                      <Text style={styles.fieldLabel}>¿CIRCUNCIDADO? (OPCIONAL)</Text>
                      <Segmented<Circuncision>
                        options={[
                          { label: "Sí", value: "si" },
                          { label: "No", value: "no" },
                          { label: "No sé", value: "nose" },
                        ]}
                        value={bebe.circuncidado}
                        onChange={(v) => actualizarBebe(bebe.id, "circuncidado", v)}
                      />
                    </View>
                  )}

                  <ComboDatePicker
                    value={bebe.fechaNacimiento}
                    onChange={(t) =>
                      actualizarBebe(bebe.id, "fechaNacimiento", t)
                    }
                  />

                  <PillInput
                    icon="scale-outline"
                    placeholder="Peso actual (kg)"
                    keyboardType="numeric"
                    value={bebe.peso}
                    onChangeText={(t) => actualizarBebe(bebe.id, "peso", t)}
                  />

                  <PillInput
                    icon="scale-outline"
                    placeholder={
                      (edadEnDias(bebe.fechaNacimiento) ?? 0) <=
                      PESO_NAC_OBLIGATORIO_HASTA_DIAS
                        ? "Peso al nacer (kg)"
                        : "Peso al nacer (kg) - opcional"
                    }
                    keyboardType="numeric"
                    value={bebe.pesoNacimiento}
                    onChangeText={(t) =>
                      actualizarBebe(bebe.id, "pesoNacimiento", t)
                    }
                  />

                  {/* Advanced Toggle */}
                  <TouchableOpacity
                    style={styles.advancedToggle}
                    onPress={() =>
                      actualizarBebe(
                        bebe.id,
                        "mostrarAvanzado",
                        !bebe.mostrarAvanzado,
                      )
                    }
                  >
                    <Ionicons
                      name={
                        bebe.mostrarAvanzado ? "chevron-up" : "chevron-down"
                      }
                      size={18}
                      color={TC.accent}
                    />
                    <Text style={styles.advancedText}>
                      Condiciones médicas (opcional)
                    </Text>
                  </TouchableOpacity>

                  {bebe.mostrarAvanzado && (
                    <View style={styles.advancedSection}>
                      <View style={styles.switchCardRow}>
                        <Text style={styles.switchLabel}>
                          ¿Nació prematuro?
                        </Text>
                        <Switch
                          value={bebe.esPrematuro}
                          onValueChange={(v) =>
                            actualizarBebe(bebe.id, "esPrematuro", v)
                          }
                          trackColor={{ true: TC.accent, false: "#CBD5E1" }}
                          thumbColor={
                            Platform.OS === "android" ? "#FFF" : undefined
                          }
                        />
                      </View>

                      {bebe.esPrematuro && (
                        <PillInput
                          icon="time-outline"
                          placeholder="Semanas de gestación"
                          keyboardType="numeric"
                          value={bebe.semanasGestacion}
                          onChangeText={(t) =>
                            actualizarBebe(bebe.id, "semanasGestacion", t)
                          }
                        />
                      )}

                      {bebe.esPrematuro && (
                        <View style={styles.switchCardRow}>
                          <Text style={styles.switchLabel}>
                            ¿Usa oxígeno suplementario?
                          </Text>
                          <Switch
                            value={bebe.usaOxigeno}
                            onValueChange={(v) =>
                              actualizarBebe(bebe.id, "usaOxigeno", v)
                            }
                            trackColor={{ true: TC.accent, false: "#CBD5E1" }}
                            thumbColor={
                              Platform.OS === "android" ? "#FFF" : undefined
                            }
                          />
                        </View>
                      )}

                      <View style={styles.switchCardRow}>
                        <Text style={styles.switchLabel}>
                          Riesgo de SDR respiratorio
                        </Text>
                        <Switch
                          value={bebe.riesgoSDR}
                          onValueChange={(v) =>
                            actualizarBebe(bebe.id, "riesgoSDR", v)
                          }
                          trackColor={{ true: TC.accent, false: "#CBD5E1" }}
                          thumbColor={
                            Platform.OS === "android" ? "#FFF" : undefined
                          }
                        />
                      </View>

                      <View style={styles.switchCardRow}>
                        <Text style={styles.switchLabel}>
                          Cardiopatía (sospecha o diagnóstico)
                        </Text>
                        <Switch
                          value={bebe.sospechaCardiopatia}
                          onValueChange={(v) =>
                            actualizarBebe(bebe.id, "sospechaCardiopatia", v)
                          }
                          trackColor={{ true: TC.accent, false: "#CBD5E1" }}
                          thumbColor={
                            Platform.OS === "android" ? "#FFF" : undefined
                          }
                        />
                      </View>

                      {bebe.sospechaCardiopatia && (
                        <View>
                          <PillInput
                            icon="pulse-outline"
                            placeholder="SpO2 basal indicada por su médico (%)"
                            keyboardType="numeric"
                            value={bebe.spo2Basal}
                            onChangeText={(t) =>
                              actualizarBebe(bebe.id, "spo2Basal", t)
                            }
                          />
                          <Text style={[styles.emojiLabelSubtitle, { marginTop: 6 }]}>
                            Opcional. Si no la sabes, pídesela a su cardiólogo: sin ella se usa el umbral general (92 %).
                          </Text>
                        </View>
                      )}

                      <View style={styles.switchCardRow}>
                        <Text style={styles.switchLabel}>
                          ¿Otros padecimientos?
                        </Text>
                        <Switch
                          value={bebe.tieneComplicaciones}
                          onValueChange={(v) =>
                            actualizarBebe(bebe.id, "tieneComplicaciones", v)
                          }
                          trackColor={{ true: TC.accent, false: "#CBD5E1" }}
                          thumbColor={
                            Platform.OS === "android" ? "#FFF" : undefined
                          }
                        />
                      </View>

                      {bebe.tieneComplicaciones && (
                        <PillInput
                          icon="medkit-outline"
                          placeholder="Describe el padecimiento..."
                          value={bebe.detallesComplicaciones}
                          onChangeText={(t) =>
                            actualizarBebe(bebe.id, "detallesComplicaciones", t)
                          }
                        />
                      )}
                    </View>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addBtn} onPress={agregarBebe}>
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={TC.accent}
                />
                <Text style={styles.addText}>Añadir otro bebé</Text>
              </TouchableOpacity>

              <GradientButton
                label="¡TODO LISTO!"
                onPress={guardarDatos}
                style={styles.mainBtn}
              />
            </View>
          )}

          <Text style={styles.footer}>
            Acompañando a tu bebé en cada latido
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrapper}>
              <Ionicons name="sparkles" size={36} color={TC.accent} />
            </View>

            <Text style={styles.modalTitle}>¡Casi listo!</Text>

            <Text style={styles.modalParagraph}>
              Has creado el perfil básico de tu bebé. Para completar toda la
              información clínica, dirígete a la sección de{" "}
              <Text style={{ fontWeight: "800", color: TC.textDark }}>
                Perfiles
              </Text>{" "}
              en la app.
            </Text>

            <View style={styles.modalTipContainer}>
              <View style={styles.modalTipIcon}>
                <Ionicons name="person-circle" size={24} color={TC.accent} />
              </View>
              <Text style={styles.modalTipText}>
                Ahí podrás configurar sus apellidos, sexo y detalles adicionales
                para asegurar la precisión del sistema de monitoreo.
              </Text>
            </View>

            <GradientButton
              label="¡ENTENDIDO!"
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/(tabs)/home");
              }}
              style={{ width: "100%" }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TC.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 24,
  },
  logoSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: TC.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
    overflow: "hidden",
  },
  logoImage: {
    width: 130,
    height: 130,
    marginTop: 18,
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    color: TC.textDark,
    letterSpacing: -0.6,
    marginTop: 16,
  },
  appTagline: {
    fontSize: 12,
    fontWeight: "700",
    color: TC.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 4,
  },
  card: {
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
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
  },
  paragraph: {
    fontSize: 15,
    color: TC.textBody,
    lineHeight: 24,
    fontWeight: "500",
    marginBottom: 24,
  },
  step2Header: {
    alignItems: "center",
    marginBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: TC.textBody,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  bebeCard: {
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
    gap: 16,
  },
  bebeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
    paddingBottom: 14,
    marginBottom: 4,
  },
  bebeLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: TC.accent,
    letterSpacing: 1.2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TC.inputBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  emojiSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: TC.inputBg,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
  },
  emojiAvatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: TC.card,
    borderWidth: 2,
    borderColor: TC.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiLabelTitle: {
    fontWeight: "700",
    color: TC.textDark,
    fontSize: 14,
  },
  emojiLabelSubtitle: {
    color: TC.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emojiDropdown: {
    backgroundColor: TC.inputBg,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    gap: 12,
  },
  emojiCategoryLabel: {
    fontSize: 11,
    color: TC.textMuted,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    backgroundColor: TC.card,
    borderColor: TC.inputBorder,
  },
  emojiItemActive: {
    borderColor: TC.accent,
    backgroundColor: TC.accent + "10",
  },
  fieldLabel: {
    fontSize: 11,
    color: TC.textMuted,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: TC.inputBg,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
  },
  segmentBtnActive: {
    borderColor: TC.accent,
    backgroundColor: TC.accent + "15",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: TC.textBody,
  },
  segmentTextActive: {
    color: TC.accent,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: TC.inputBorder,
    paddingTop: 16,
  },
  advancedText: {
    fontSize: 14,
    color: TC.accent,
    fontWeight: "700",
  },
  advancedSection: {
    gap: 16,
    paddingTop: 4,
  },
  switchCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: TC.inputBg,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  switchLabel: {
    fontSize: 14,
    color: TC.textBody,
    fontWeight: "600",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: TC.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: TC.accent,
    borderStyle: "dashed",
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  addText: {
    fontSize: 15,
    fontWeight: "700",
    color: TC.accent,
  },
  mainBtn: {
    width: "100%",
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: TC.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: "auto",
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(61,44,46,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: TC.card,
    borderRadius: 32,
    padding: 32,
    width: "100%",
    alignItems: "center",
    shadowColor: TC.textDark,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  modalIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: TC.accent + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderCurve: "continuous" as any,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: TC.textDark,
    marginBottom: 12,
    textAlign: "center",
  },
  modalParagraph: {
    fontSize: 15,
    color: TC.textBody,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalTipContainer: {
    backgroundColor: TC.inputBg,
    borderRadius: 20,
    padding: 16,
    width: "100%",
    marginBottom: 32,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: TC.inputBorder,
    gap: 12,
  },
  modalTipIcon: {
    backgroundColor: TC.card,
    borderRadius: 12,
    padding: 6,
    shadowColor: TC.textDark,
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  modalTipText: {
    flex: 1,
    fontSize: 13,
    color: TC.textBody,
    lineHeight: 18,
    fontWeight: "500",
  },
});
