import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { TC } from '../components/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ManualIMSSScreen() {
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
          <Text style={styles.headerLabel}>REFERENCIA CLÍNICA</Text>
          <Text style={styles.headerTitle}>Manual IMSS</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Newborn Care ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: TC.vitalHeart + '15' }]}>
              <Ionicons name="heart" size={18} color={TC.vitalHeart} />
            </View>
            <Text style={styles.sectionTitle}>Cuidados del Recién Nacido</Text>
          </View>
          <Text style={styles.sectionSubtitle}>0 a 1 mes de edad</Text>

          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalHeart }]} />
            <Text style={styles.listText}><Text style={styles.bold}>Primeros 3 días:</Text> Fomente la lactancia materna exclusiva. Exponga la piel del bebé al sol de manera indirecta para prevenir deficiencia de vitamina D. El bebé debe dormir siempre boca arriba bajo vigilancia.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalHeart }]} />
            <Text style={styles.listText}><Text style={styles.bold}>3 a 7 días:</Text> Realizar prueba del Tamiz Neonatal (detección de enfermedades metabólicas) entre el 3er y 5to día.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalHeart }]} />
            <Text style={styles.listText}><Text style={styles.bold}>0 a 1 mes:</Text> Hable, cante y acaricie al bebé. Identifique signos de depresión posparto en la madre.</Text>
          </View>
        </View>

        {/* ── First Year ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: TC.accent + '15' }]}>
              <Ionicons name="trending-up" size={18} color={TC.accent} />
            </View>
            <Text style={styles.sectionTitle}>Desarrollo durante el Primer Año</Text>
          </View>

          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.accent }]} />
            <Text style={styles.listText}><Text style={styles.bold}>1 a 2 meses:</Text> Colóquelo boca abajo sobre una superficie firme y apoye su pecho para fortalecer su cuello. Estimule su aprendizaje con música.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.accent }]} />
            <Text style={styles.listText}><Text style={styles.bold}>2 a 3 meses:</Text> Ejercite los músculos de sus ojos mostrándole diferentes objetos para que intente tomarlos con sus manos.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.accent }]} />
            <Text style={styles.listText}><Text style={styles.bold}>3 a 5 meses:</Text> Coloque en la palma de su mano objetos para que los sostenga. Ayúdele a sentarse tomándolo de los hombros.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.accent }]} />
            <Text style={styles.listText}><Text style={styles.bold}>6 a 8 meses:</Text> Ayúdele a mantenerse sentado con apoyo. Fomente rutinas de sueño y alimentación.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.accent }]} />
            <Text style={styles.listText}><Text style={styles.bold}>8 a 12 meses:</Text> Comenzará a gatear (No utilizar andadera). Comenzará a sostenerse de muebles para pararse.</Text>
          </View>
        </View>

        {/* ── 1-2 Years ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: TC.vitalActivity + '15' }]}>
              <Ionicons name="walk" size={18} color={TC.vitalActivity} />
            </View>
            <Text style={styles.sectionTitle}>Desarrollo de 1 a 2 Años</Text>
          </View>

          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalActivity }]} />
            <Text style={styles.listText}><Text style={styles.bold}>1 Año:</Text> Permítale caminar descalzo en texturas diferentes para mejorar su equilibrio y formar el arco plantar.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalActivity }]} />
            <Text style={styles.listText}><Text style={styles.bold}>2 Años:</Text> Correrá pero no sabrá detenerse. Permítale expresarse verbalmente para desarrollar el lenguaje. Inicie el entrenamiento para dejar el pañal.</Text>
          </View>
        </View>

        {/* ── Critical Alert ── */}
        <View style={styles.alertCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: TC.vitalHeart + '18' }]}>
              <Ionicons name="warning" size={18} color={TC.vitalHeart} />
            </View>
            <Text style={[styles.sectionTitle, { color: TC.vitalHeart }]}>Signos de Alarma Críticos</Text>
          </View>
          <Text style={styles.alertIntro}>
            Debe buscar atención médica inmediatamente si observa:
          </Text>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalHeart }]} />
            <Text style={styles.alertListText}>No responde a ruidos fuertes.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalHeart }]} />
            <Text style={styles.alertListText}>No sigue objetos con la vista o no sonríe.</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalHeart }]} />
            <Text style={styles.alertListText}>Falta de tono muscular (se siente "aguado").</Text>
          </View>
          <View style={styles.listItem}>
            <View style={[styles.bulletDot, { backgroundColor: TC.vitalHeart }]} />
            <Text style={styles.alertListText}>Movimientos de ojos anormales.</Text>
          </View>
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
    marginBottom: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous' as any,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TC.textMuted,
    marginBottom: 16,
    marginLeft: 48, // align with text after iconBadge
  },

  /* ── List items ── */
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: TC.textBody,
    lineHeight: 23,
    fontWeight: '500',
  },
  bold: {
    fontWeight: '800',
    color: TC.textDark,
  },

  /* ── Alert card ── */
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
  alertIntro: {
    fontSize: 15,
    color: TC.textBody,
    lineHeight: 23,
    fontWeight: '600',
    marginBottom: 16,
  },
  alertListText: {
    flex: 1,
    fontSize: 15,
    color: TC.textDark,
    lineHeight: 23,
    fontWeight: '600',
  },
});
