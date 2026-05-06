import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { TC } from '../components/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ManualIMSSScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={28} color={TC.textDark} onPress={() => router.back()} />
        <Text style={styles.title}>Manual Clínico IMSS</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Cuidados del Recién Nacido (0 a 1 mes)</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>Primeros 3 días:</Text> Fomente la lactancia materna exclusiva. Exponga la piel del bebé al sol de manera indirecta para prevenir deficiencia de vitamina D. El bebé debe dormir siempre boca arriba bajo vigilancia.</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>3 a 7 días:</Text> Realizar prueba del Tamiz Neonatal (detección de enfermedades metabólicas) entre el 3er y 5to día.</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>0 a 1 mes:</Text> Hable, cante y acaricie al bebé. Identifique signos de depresión posparto en la madre.</Text>

        <Text style={styles.sectionTitle}>Desarrollo durante el Primer Año</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>1 a 2 meses:</Text> Colóquelo boca abajo sobre una superficie firme y apoye su pecho para fortalecer su cuello. Estimule su aprendizaje con música.</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>2 a 3 meses:</Text> Ejercite los músculos de sus ojos mostrándole diferentes objetos para que intente tomarlos con sus manos.</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>3 a 5 meses:</Text> Coloque en la palma de su mano objetos para que los sostenga. Ayúdele a sentarse tomándolo de los hombros.</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>6 a 8 meses:</Text> Ayúdele a mantenerse sentado con apoyo. Fomente rutinas de sueño y alimentación.</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>8 a 12 meses:</Text> Comenzará a gatear (No utilizar andadera). Comenzará a sostenerse de muebles para pararse.</Text>

        <Text style={styles.sectionTitle}>Desarrollo de 1 a 2 Años</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>1 Año:</Text> Permítale caminar descalzo en texturas diferentes para mejorar su equilibrio y formar el arco plantar.</Text>
        <Text style={styles.listItem}>• <Text style={styles.bold}>2 Años:</Text> Correrá pero no sabrá detenerse. Permítale expresarse verbalmente para desarrollar el lenguaje. Inicie el entrenamiento para dejar el pañal.</Text>

        <Text style={styles.sectionTitle}>Signos de Alarma Críticos</Text>
        <Text style={styles.alertText}>
          Debe buscar atención médica inmediatamente si observa:{"\n"}
          - No responde a ruidos fuertes.{"\n"}
          - No sigue objetos con la vista o no sonríe.{"\n"}
          - Falta de tono muscular (se siente "aguado").{"\n"}
          - Movimientos de ojos anormales.
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: TC.accent, marginTop: 24, marginBottom: 12 },
  listItem: { fontSize: 16, color: TC.textBody, lineHeight: 24, marginBottom: 8, textAlign: 'justify' },
  bold: { fontWeight: '700', color: '#1F2937' },
  alertText: { fontSize: 16, color: '#DC2626', lineHeight: 24, backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12, marginTop: 12 },
});
