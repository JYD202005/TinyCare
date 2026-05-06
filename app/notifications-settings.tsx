import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TC } from "../components/theme";
import { useNotificationSettings } from "../src/services/notifications/useNotificationSettings";
import { router } from "expo-router";

// ─── SwitchRow ────────────────────────────────────────────────────────────────
const SwitchRow = ({
  icon,
  iconColor,
  iconBg,
  label,
  sublabel,
  value,
  onToggle,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) => (
  <View style={[styles.settingRow, disabled && { opacity: 0.5 }]}>
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
      disabled={disabled}
      trackColor={{ false: "#E5E7EB", true: TC.vitalHeart + "60" }}
      thumbColor={value ? TC.vitalHeart : "#D1D5DB"}
      ios_backgroundColor="#E5E7EB"
    />
  </View>
);

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, toggle } = useNotificationSettings();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={TC.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Notificaciones</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Personaliza cómo y cuándo TinyCare te notifica sobre el estado de tu bebé y los dispositivos.
        </Text>

        {/* ── Recordatorios Recurrentes ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recordatorios Recurrentes</Text>
          <View style={styles.cardGroup}>
            <SwitchRow
              icon="eye"
              iconColor={TC.accent}
              iconBg={TC.accent + "15"}
              label="Revisar al bebé"
              sublabel="Aviso periódico para ir a ver cómo está"
              value={settings.recordatoriosBebe}
              onToggle={() => toggle("recordatoriosBebe")}
            />
            <View style={styles.divider} />
            <SwitchRow
              icon="restaurant"
              iconColor="#F59E0B"
              iconBg="#FEF9EB"
              label="Alimentación"
              sublabel="Recordatorios para que coma a su hora"
              value={settings.recordatoriosAlimentacion}
              onToggle={() => toggle("recordatoriosAlimentacion")}
            />
          </View>
        </View>

        {/* ── Alertas Médicas ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertas de Signos Vitales</Text>
          <View style={styles.cardGroup}>
            <SwitchRow
              icon="warning"
              iconColor="#F59E0B"
              iconBg="#FEF9EB"
              label="Alertas Amarillas"
              sublabel="Precauciones y variaciones leves"
              value={settings.alertasAmarillas}
              onToggle={() => toggle("alertasAmarillas")}
            />
            <View style={styles.divider} />
            <SwitchRow
              icon="alert-circle"
              iconColor="#EF4444"
              iconBg="#FEF2F2"
              label="Alertas Rojas (Críticas)"
              sublabel="Emergencias de máxima prioridad"
              value={settings.alertasRojas}
              onToggle={() => toggle("alertasRojas")}
            />
          </View>
        </View>

        {/* ── Avisos de Sensores ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sensores y Dispositivos</Text>
          <View style={styles.cardGroup}>
            <SwitchRow
              icon="bluetooth"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              label="Conexión del sensor"
              sublabel="Avisos de desconexión del ESP"
              value={settings.conexion}
              onToggle={() => toggle("conexion")}
            />
            <View style={styles.divider} />
            <SwitchRow
              icon="hardware-chip"
              iconColor={TC.textBody}
              iconBg={TC.inputBorder}
              label="Avisos del sensor"
              sublabel="Batería baja, errores de calibración, etc."
              value={settings.avisosSensor}
              onToggle={() => toggle("avisosSensor")}
            />
          </View>
        </View>

        {/* ── Sonido y Personalización ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio y Vibración</Text>
          <View style={styles.cardGroup}>
            <SwitchRow
              icon="volume-high"
              iconColor={TC.vitalOxygen}
              iconBg={TC.vitalOxygen + "20"}
              label="Sonido en notificaciones"
              sublabel="Habilitar audio general"
              value={settings.sonido}
              onToggle={() => toggle("sonido")}
            />
            <View style={styles.divider} />
            <SwitchRow
              icon="musical-notes"
              iconColor="#8B5CF6"
              iconBg="#F3E8FF"
              label="Sonidos personalizados"
              sublabel="Sonidos distintos para amarillas y rojas"
              value={settings.sonidosPersonalizados}
              onToggle={() => toggle("sonidosPersonalizados")}
              disabled={!settings.sonido}
            />
            <View style={styles.divider} />
            <SwitchRow
              icon="phone-portrait"
              iconColor={TC.textDark}
              iconBg={TC.inputBorder}
              label="Vibración"
              sublabel="Vibrar junto con el sonido"
              value={settings.vibracion}
              onToggle={() => toggle("vibracion")}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingTop: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    color: TC.textBody,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
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
  divider: {
    height: 1,
    backgroundColor: TC.inputBorder,
    marginLeft: 64,
  },
});
