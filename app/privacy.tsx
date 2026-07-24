import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { TC } from '../components/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── matches home.tsx hierarchy */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
            <Ionicons name="chevron-back" size={24} color={TC.textDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>CUMPLIMIENTO</Text>
          <Text style={styles.headerTitle}>Privacidad y Datos</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Intro Card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: TC.accent + '15' }]}>
              <Ionicons name="shield-checkmark" size={18} color={TC.accent} />
            </View>
            <Text style={styles.cardTitle}>Cumplimiento y Privacidad</Text>
          </View>
          <Text style={styles.paragraph}>
            TinyCare se define como una solución de salud digital de monitoreo continuo y no invasivo, diseñada para la vigilancia de biomarcadores pediátricos en tiempo real. Este documento detalla nuestro compromiso con la privacidad de los datos sensibles y el cumplimiento clínico.
          </Text>
        </View>

        {/* ── Section 1 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: TC.vitalOxygen + '15' }]}>
              <Ionicons name="lock-closed" size={18} color={TC.vitalOxygen} />
            </View>
            <Text style={styles.cardTitle}>Privacidad de Datos Sensibles</Text>
          </View>
          <Text style={styles.paragraph}>
            Reconociendo que se maneja información de menores, el sistema contempla protocolos de cifrado y cumplimiento con la normativa de protección de datos personales. La arquitectura offline-first con WatermelonDB asegura que, por defecto, los datos existan únicamente en el dispositivo local, garantizando la soberanía de la información familiar. La sincronización a la nube mediante Supabase (con Row Level Security) se realiza de forma atómica y cifrada, limitando el acceso exclusivamente a los usuarios autorizados en el "Plan Familiar".
          </Text>
        </View>

        {/* ── Section 2 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: TC.vitalTemp + '15' }]}>
              <Ionicons name="medkit" size={18} color={TC.vitalTemp} />
            </View>
            <Text style={styles.cardTitle}>Uso de la Información Clínica</Text>
          </View>
          <Text style={styles.paragraph}>
            TinyCare no es una herramienta recreativa; su enfoque es la prevención y el seguimiento clínico de signos vitales. El sistema no sustituye al médico, sino que se posiciona como una plataforma de asistencia y monitoreo a distancia. Los datos generados (Frecuencia Cardíaca, Temperatura y Saturación de Oxígeno) son analizados por nuestro Motor de Evaluación de Umbrales Pediátricos para emitir alertas basadas en riesgos reales y compilar un Historial Médico Digital que el padre puede compartir de manera estructurada con su pediatra.
          </Text>
        </View>

        {/* ── Section 3 ── */}
        <View style={styles.alertCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: TC.vitalHeart + '18' }]}>
              <Ionicons name="alert-circle" size={18} color={TC.vitalHeart} />
            </View>
            <Text style={[styles.cardTitle, { color: TC.vitalHeart }]}>Limitaciones de Responsabilidad</Text>
          </View>
          <Text style={styles.alertParagraph}>
            La aplicación provee asistencia clínica en tiempo real mediante algoritmos validados, sin embargo, en caso de una alerta crítica (Alerta Roja), el usuario debe buscar atención médica profesional inmediatamente. El hardware y software están desarrollados estrictamente con una finalidad médica de prevención, en cumplimiento de los estándares de InnovaTecNM 2026.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },

  /* ── Header — mirrors home.tsx pattern ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerLeft: { width: 44 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { width: 44 },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TC.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TC.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.4,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 16,
  },

  /* ── Cards — same spec as home.tsx infoStyles.cardFull ── */
  card: {
    backgroundColor: TC.card,
    borderRadius: 32,
    padding: 24,
    borderCurve: 'continuous' as any,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous' as any,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  paragraph: {
    fontSize: 15,
    color: TC.textBody,
    lineHeight: 24,
    fontWeight: '500',
  },

  /* ── Alert card — mirrors home.tsx bleBannerDisconnected ── */
  alertCard: {
    backgroundColor: TC.vitalHeart + '08',
    borderRadius: 32,
    padding: 24,
    borderCurve: 'continuous' as any,
    borderWidth: 1,
    borderColor: TC.vitalHeart + '20',
    shadowColor: TC.vitalHeart,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  alertParagraph: {
    fontSize: 15,
    color: TC.textDark,
    lineHeight: 24,
    fontWeight: '600',
  },
});
