import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { TC } from '../components/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={28} color={TC.textDark} onPress={() => router.back()} />
        <Text style={styles.title}>Privacidad y Datos</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Cumplimiento y Privacidad (TinyCare)</Text>
        <Text style={styles.paragraph}>
          TinyCare se define como una solución de salud digital de monitoreo continuo y no invasivo, diseñada para la vigilancia de biomarcadores pediátricos en tiempo real. Este documento detalla nuestro compromiso con la privacidad de los datos sensibles y el cumplimiento clínico.
        </Text>

        <Text style={styles.heading}>1. Privacidad de Datos Sensibles</Text>
        <Text style={styles.paragraph}>
          Reconociendo que se maneja información de menores, el sistema contempla protocolos de cifrado y cumplimiento con la normativa de protección de datos personales. La arquitectura offline-first con WatermelonDB asegura que, por defecto, los datos existan únicamente en el dispositivo local, garantizando la soberanía de la información familiar. La sincronización a la nube mediante Supabase (con Row Level Security) se realiza de forma atómica y cifrada, limitando el acceso exclusivamente a los usuarios autorizados en el "Plan Familiar".
        </Text>

        <Text style={styles.heading}>2. Uso de la Información Clínica</Text>
        <Text style={styles.paragraph}>
          TinyCare no es una herramienta recreativa; su enfoque es la prevención y el seguimiento clínico de signos vitales. El sistema no sustituye al médico, sino que se posiciona como una plataforma de asistencia y monitoreo a distancia. Los datos generados (Frecuencia Cardíaca, Temperatura y Saturación de Oxígeno) son analizados por nuestro Motor de Evaluación de Umbrales Pediátricos para emitir alertas basadas en riesgos reales y compilar un Historial Médico Digital que el padre puede compartir de manera estructurada con su pediatra.
        </Text>

        <Text style={styles.heading}>3. Limitaciones de Responsabilidad</Text>
        <Text style={styles.paragraph}>
          La aplicación provee asistencia clínica en tiempo real mediante algoritmos validados, sin embargo, en caso de una alerta crítica (Alerta Roja), el usuario debe buscar atención médica profesional inmediatamente. El hardware y software están desarrollados estrictamente con una finalidad médica de prevención, en cumplimiento de los estándares de InnovaTecNM 2026.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: TC.bg,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 22, fontWeight: '700', color: TC.textDark, marginLeft: 16 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 18, fontWeight: '700', color: TC.accent, marginTop: 24, marginBottom: 12 },
  paragraph: { fontSize: 16, color: TC.textBody, lineHeight: 24, textAlign: 'justify' },
});
