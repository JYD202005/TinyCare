import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TC } from "../../components/theme";
import { useToast } from "../../components/Toast";
import { database } from "../../src/database";
import { Cuidador, Dispositivo, Perfil } from "../../src/database/models";
import { useNotificationSettings } from "../../src/services/notifications/useNotificationSettings";
import { useAuth } from "../../src/providers/AuthProvider";
import { useSync } from "../../src/hooks/useSync";
import { supabase } from "../../src/services/supabase/client";

// ─── SettingRow ───────────────────────────────────────────────────────────────

const SettingRow = ({
  icon,
  iconColor = TC.accent,
  iconBg = TC.accent + "15",
  label,
  sublabel,
  value,
  onPress,
  isDestructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  label: string;
  sublabel?: string;
  value?: string;
  onPress?: () => void;
  isDestructive?: boolean;
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    activeOpacity={onPress ? 0.7 : 1}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.settingLeft}>
      <View
        style={[
          styles.settingIconBox,
          { backgroundColor: isDestructive ? "#FEE2E2" : iconBg },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isDestructive ? "#EF4444" : iconColor}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.settingLabel, isDestructive && { color: "#EF4444" }]}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.settingSublabel}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
    <View style={styles.settingRight}>
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={TC.textMuted} />
      ) : null}
    </View>
  </TouchableOpacity>
);

// ─── SwitchRow ────────────────────────────────────────────────────────────────

const SwitchRow = ({
  icon,
  iconColor,
  iconBg,
  label,
  sublabel,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: () => void;
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLeft}>
      <View style={[styles.settingIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sublabel ? (
          <Text style={styles.settingSublabel}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: "#E5E7EB", true: TC.vitalHeart + "60" }}
      thumbColor={value ? TC.vitalHeart : "#D1D5DB"}
      ios_backgroundColor="#E5E7EB"
    />
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { showToast, ToastComponent } = useToast();
  const { settings, toggle } = useNotificationSettings();
  const { session } = useAuth();
  const { isSyncing } = useSync();

  const [babies, setBabies] = useState<
    { id: string; name: string; emoji: string }[]
  >([]);
  const [pairedDevices, setPairedDevices] = useState<Dispositivo[]>([]);
  const [cuidadores, setCuidadores] = useState<Cuidador[]>([]);

  // ── Reactive data from DB ─────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const perfilesCol = database.collections.get<Perfil>("perfiles");
      const dispositivosCol =
        database.collections.get<Dispositivo>("dispositivos");
      const cuidadoresCol = database.collections.get<Cuidador>("cuidadores");

      const sub1 = perfilesCol
        .query()
        .observe()
        .subscribe((perfiles) => {
          setBabies(
            perfiles.map((p) => ({
              id: p.id,
              name: p.nombreIdentificador || "Bebé",
              emoji: p.avatar || "👶🏻",
            }))
          );
        });

      const sub2 = dispositivosCol
        .query()
        .observe()
        .subscribe(setPairedDevices);

      const sub3 = cuidadoresCol
        .query()
        .observe()
        .subscribe(setCuidadores);

      return () => {
        sub1.unsubscribe();
        sub2.unsubscribe();
        sub3.unsubscribe();
      };
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que deseas cerrar sesión? Volverás al modo local.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              showToast("error", error.message);
            } else {
              showToast("success", "Sesión cerrada correctamente");
            }
          },
        },
      ]
    );
  };

  // Valores derivados
  const deviceLabel =
    pairedDevices.length > 0
      ? `${pairedDevices.length} vinculado${pairedDevices.length > 1 ? "s" : ""}`
      : "Sin vincular";

  const cuidadoresLabel =
    cuidadores.length > 0
      ? `${cuidadores.length} contacto${cuidadores.length > 1 ? "s" : ""}`
      : null; // null = no mostrar si no hay datos

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {ToastComponent}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        {/* ── Cloud Card ── */}
        {!session ? (
          <View style={styles.cloudCard}>
            <View style={styles.cloudLeft}>
              <View style={styles.cloudAvatar}>
                <Ionicons name="cloud-offline" size={28} color={TC.textMuted} />
              </View>
              <View style={styles.cloudTextContainer}>
                <Text style={styles.cloudTitle}>Modo Local Activo</Text>
                <Text style={styles.cloudSub}>
                  Los datos solo existen en tu dispositivo.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.cloudBtn} activeOpacity={0.8} onPress={() => router.push('/login')}>
              <Text style={styles.cloudBtnText}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.cloudCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
            <View style={styles.cloudLeft}>
              <View style={[styles.cloudAvatar, { backgroundColor: '#FFF' }]}>
                <Ionicons name="cloud-done" size={28} color={TC.vitalHeart} />
              </View>
              <View style={styles.cloudTextContainer}>
                <Text style={styles.cloudTitle}>
                  Nube Activa {isSyncing && "(Sinc...)"}
                </Text>
                <Text style={styles.cloudSub}>
                  Sesión: {session.user?.email}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Mis Bebés ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis Bebés</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.babiesScroll}
          >
            {babies.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.babyCard}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({ pathname: "/edit-baby", params: { id: b.id } })
                }
              >
                <View style={styles.babyEmojiBox}>
                  <Text style={styles.babyEmoji}>{b.emoji}</Text>
                </View>
                <Text style={styles.babyName} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={styles.babyEdit}>Editar Perfil</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.babyAddCard}
              activeOpacity={0.8}
              onPress={() => router.push("/onboarding")}
            >
              <View style={styles.babyAddIconBox}>
                <Ionicons name="add" size={32} color={TC.accent} />
              </View>
              <Text style={styles.babyAddText}>Añadir Bebé</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── General ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.cardGroup}>
            {/* Sensores — siempre visible porque gestión es útil */}
            <SettingRow
              icon="bluetooth"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              label="Gestión de Sensores"
              value={deviceLabel}
              onPress={() => router.push("/sensor-management")}
            />

            <View style={styles.divider} />
            <SettingRow
              icon="person-add"
              iconColor={TC.vitalHeart}
              iconBg={TC.vitalHeart + "15"}
              label="Invitar Cuidador"
              sublabel="Compartir perfil por correo"
              onPress={() => router.push("/invite-caregiver")}
            />

            {/* Cuidadores — solo mostrar si hay alguno registrado */}
            {cuidadoresLabel !== null && (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon="people"
                  iconColor={TC.vitalHeart}
                  iconBg={TC.vitalHeart + "15"}
                  label="Familia y Cuidadores"
                  value={cuidadoresLabel}
                />
              </>
            )}
          </View>
        </View>

        {/* ── Notificaciones ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>

          {/* Info: sin sensor no hay alertas vitales */}
          {pairedDevices.length === 0 && (
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#92400E"
              />
              <Text style={styles.infoBoxText}>
                Sin sensor vinculado, las alertas de signos vitales no están
                disponibles.
              </Text>
            </View>
          )}

          <View style={styles.cardGroup}>
            <SettingRow
              icon="notifications"
              iconColor="#F59E0B"
              iconBg="#FEF9EB"
              label="Configuración de Notificaciones"
              sublabel="Recordatorios, alertas médicas, sonidos y sensores"
              onPress={() => router.push("/notifications-settings")}
            />
          </View>
        </View>

        {/* ── Ayuda ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ayuda y Soporte</Text>
          <View style={styles.cardGroup}>
            <SettingRow 
              icon="document-text" 
              iconColor="#F87171"
              iconBg="#FEE2E2"
              label="Manual Clínico IMSS" 
              onPress={() => router.push("/manual-imss")}
            />
            <View style={styles.divider} />
            <SettingRow 
              icon="shield-checkmark" 
              iconColor="#F87171"
              iconBg="#FEE2E2"
              label="Privacidad y Datos" 
              onPress={() => router.push("/privacy")}
            />
          </View>
        </View>

        {/* ── Opciones de Cuenta ── */}
        {session && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuenta</Text>
            <View style={styles.cardGroup}>
              <SettingRow
                icon="person"
                iconColor="#3B82F6"
                iconBg="#DBEAFE"
                label="Cuenta Activa"
                sublabel={session.user.email}
              />
              <View style={styles.divider} />
              <SettingRow
                icon="log-out"
                label="Cerrar Sesión"
                isDestructive
                onPress={handleLogout}
              />
            </View>
          </View>
        )}

        <Text style={styles.versionText}>TinyCare v1.0.0 (InnovaTecNM 2026)</Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },

  header: { marginBottom: 24 },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.8,
  },

  /* Cloud Card */
  cloudCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TC.accentLight,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    marginBottom: 32,
    borderCurve: "continuous" as any,
    gap: 16,
  },
  cloudLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  cloudAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    elevation: 2,
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cloudTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TC.textDark,
    marginBottom: 2,
  },
  cloudSub: { fontSize: 13, color: TC.textBody, fontWeight: "500" },
  cloudTextContainer: { flex: 1 },
  cloudBtn: {
    backgroundColor: TC.textDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cloudBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },

  /* Sections */
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  /* Babies */
  babiesScroll: { gap: 16, paddingRight: 20 },
  babyCard: {
    width: 140,
    backgroundColor: TC.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderCurve: "continuous" as any,
  },
  babyEmojiBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TC.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  babyEmoji: { fontSize: 32 },
  babyName: {
    fontSize: 16,
    fontWeight: "700",
    color: TC.textDark,
    marginBottom: 4,
    textAlign: "center",
  },
  babyEdit: { fontSize: 13, fontWeight: "600", color: TC.accent },
  babyAddCard: {
    width: 140,
    backgroundColor: "transparent",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: TC.inputBorder,
    borderStyle: "dashed",
    borderCurve: "continuous" as any,
  },
  babyAddIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  babyAddText: { fontSize: 15, fontWeight: "700", color: TC.textMuted },

  /* Settings */
  cardGroup: {
    backgroundColor: TC.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    overflow: "hidden",
    borderCurve: "continuous" as any,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: TC.card,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderCurve: "continuous" as any,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: TC.textDark,
  },
  settingSublabel: {
    fontSize: 12,
    fontWeight: "500",
    color: TC.textMuted,
    lineHeight: 16,
    marginTop: 1,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: "500",
    color: TC.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: TC.inputBorder,
    marginLeft: 64,
  },

  /* Info box */
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    lineHeight: 18,
  },

  /* Footer */
  versionText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    color: TC.textMuted,
    marginTop: 20,
    marginBottom: 40,
  },

  /* Needed for theme reference */
  vitalHeart: {},
  vitalOxygen: {},
});

// Extend TC for vitalOxygen / vitalHeart refs used inline
const { vitalHeart, vitalOxygen } = TC;
