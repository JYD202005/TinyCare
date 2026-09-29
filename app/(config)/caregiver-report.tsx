import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TC } from '../../components/theme';
import { database } from '../../src/database';
import { evaluarReporteCuidador, ReporteCuidador } from '../../src/utils/evaluadorComplementario';
import { AlertaExt, calcularEdad } from '../../src/utils/evaluadorMedico';

type Item = { grupo: string; clave: string; label: string };
const ITEMS: Item[] = [
  { grupo: 'respiracion', clave: 'cianosis', label: 'Piel o labios azulados/grisáceos' },
  { grupo: 'respiracion', clave: 'costillasHundidas', label: 'Se le hunden las costillas al respirar' },
  { grupo: 'respiracion', clave: 'aleteoNasal', label: 'Aletea la nariz al respirar' },
  { grupo: 'respiracion', clave: 'quejido', label: 'Hace un quejido al respirar' },
  { grupo: 'respiracion', clave: 'muyRapida', label: 'Respira muy rápido' },
  { grupo: 'hidratacion', clave: 'menosPanales', label: 'Moja menos pañales de lo normal' },
  { grupo: 'hidratacion', clave: 'vomitoDiarreaRepetidos', label: 'Vómito o diarrea repetidos' },
  { grupo: 'hidratacion', clave: 'fontanelaHundida', label: 'Mollera hundida' },
  { grupo: 'hidratacion', clave: 'sinLagrimas', label: 'Llora sin lágrimas' },
  { grupo: 'hidratacion', clave: 'irritableLetargico', label: 'Muy irritable o muy decaído' },
  { grupo: 'alimentacion', clave: 'rechazaTomas', label: 'Rechaza las tomas' },
  { grupo: 'alimentacion', clave: 'vomitoProyectil', label: 'Vómito en proyectil' },
  { grupo: 'alimentacion', clave: 'vomitoVerde', label: 'Vómito verde' },
  { grupo: 'estado', clave: 'muyDormidoDificilDespertar', label: 'Muy dormido, cuesta despertarlo' },
  { grupo: 'estado', clave: 'irritableInconsolable', label: 'Llora y no logro consolarlo' },
  { grupo: 'estado', clave: 'flacido', label: 'Se siente flácido ("aguado")' },
  { grupo: 'piel', clave: 'ictericia', label: 'Piel u ojos amarillos' },
  { grupo: 'piel', clave: 'petequias', label: 'Manchas que no se borran al presionar' },
  { grupo: '', clave: 'hecesConSangreOJalea', label: 'Heces con sangre o moco' },
  { grupo: '', clave: 'convulsion', label: 'Posible convulsión' },
  { grupo: '', clave: 'rigidezCuello', label: 'Cuello rígido' },
];
const color = (n: string) => (n === 'Critico' ? '#DC2626' : n === 'Advertencia' ? '#F59E0B' : TC.textMuted);

export default function CaregiverReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<AlertaExt[] | null>(null);
  const key = (i: Item) => `${i.grupo}.${i.clave}`;

  const evaluar = async () => {
    const r: any = {};
    ITEMS.filter(i => sel[key(i)]).forEach(i => {
      if (i.grupo) (r[i.grupo] ??= {})[i.clave] = true; else r[i.clave] = true;
    });
    const stored = await AsyncStorage.getItem('@active_baby_id');
    const perfilId = stored ?? (await database.get('perfiles').query().fetch())[0]?.id;
    let lectura: any, edad: any, fcAltaPersistente = false;
    if (perfilId) {
      const t: any = (await database.get('telemetria_cruda').query(Q.where('id_perfil', perfilId), Q.sortBy('timestamp_medicion', Q.desc), Q.take(1)).fetch())[0];
      // Solo se usa la lectura si es reciente (últimos 15 min)
      if (t && Date.now() - t.timestampMedicion < 15 * 60000) lectura = { temp: t.temp, spo2: t.spo2 };
      const dp: any = (await database.get('datos_personales').query(Q.where('id_perfil', perfilId)).fetch())[0];
      const sc: any = (await database.get('salud_contexto').query(Q.where('id_perfil', perfilId)).fetch())[0];
      if (dp?.fechaNacimiento) edad = calcularEdad({ id: perfilId, grupoEdad: sc?.grupoEdad ?? 'Lactante', esPrematuro: !!sc?.esPrematuro, altoRiesgoSDR: false, fechaNacimiento: dp.fechaNacimiento, edadGestacionalSemanas: sc?.edadGestacionalSemanas ?? undefined } as any);
    }
    const alertas = evaluarReporteCuidador(r as ReporteCuidador, { lectura, edad, fcAltaPersistente });
    setResult(alertas);
    if (perfilId && alertas.length) {
      try {
        await database.write(async () => {
          for (const a of alertas) {
            await database.get('alertas_medicas').create((x: any) => {
              x.idPerfil = perfilId; x.tipoAlerta = a.tipo; x.nivel = a.nivel; x.mensajeMedico = a.mensaje;
              x.valorRegistrado = 'Reporte del cuidador'; x.timestampEvento = Date.now(); x.leida = false; x.isSynced = false;
            });
          }
        });
      } catch (e) { console.warn('No se guardó el reporte:', e); }
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={24} color={TC.textDark} /></TouchableOpacity>
        <Text style={s.title}>¿Cómo lo ves?</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 60 }}>
        <Text style={s.intro}>Marca lo que observas ahora. No sustituye la valoración de un médico.</Text>
        {ITEMS.map(i => {
          const on = !!sel[key(i)];
          return (
            <TouchableOpacity key={key(i)} style={[s.item, on && s.itemOn]} onPress={() => setSel(p => ({ ...p, [key(i)]: !p[key(i)] }))}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? TC.vitalHeart : TC.textMuted} />
              <Text style={s.itemText}>{i.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={s.btn} onPress={evaluar}><Text style={s.btnText}>Evaluar</Text></TouchableOpacity>
        {result && (result.length === 0
          ? <Text style={s.ok}>Con lo que marcaste no se detectan señales de alarma. Si algo te preocupa, consulta a tu pediatra.</Text>
          : result.map((a, k) => (
            <View key={k} style={[s.res, { borderColor: color(a.nivel) }]}>
              <Text style={[s.resTitle, { color: color(a.nivel) }]}>{a.tipo}</Text>
              <Text style={s.resMsg}>{a.mensaje}</Text>
            </View>
          )))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: TC.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: TC.textDark },
  intro: { color: TC.textBody, fontSize: 14, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: TC.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: TC.inputBorder },
  itemOn: { borderColor: TC.vitalHeart },
  itemText: { flex: 1, color: TC.textDark, fontSize: 15, fontWeight: '600' },
  btn: { backgroundColor: TC.vitalHeart, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  ok: { color: TC.textBody, fontSize: 15, marginTop: 8 },
  res: { backgroundColor: TC.card, borderRadius: 16, padding: 16, borderWidth: 2, marginTop: 8 },
  resTitle: { fontWeight: '800', fontSize: 16, marginBottom: 4 },
  resMsg: { color: TC.textDark, fontSize: 14, lineHeight: 20 },
});
