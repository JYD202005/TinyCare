import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TC } from '../../components/theme';
import { useToast } from '../../components/Toast';
import { database } from '../../src/database';

const num = (t: string) => parseFloat(t.trim().replace(',', '.'));

async function perfilActivoId(): Promise<string | null> {
  const stored = await AsyncStorage.getItem('@active_baby_id');
  if (stored) return stored;
  const p = await database.get('perfiles').query().fetch();
  return p[0]?.id ?? null;
}

export default function RegisterWeightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast, ToastComponent } = useToast();
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [historial, setHistorial] = useState<any[]>([]);

  const cargar = useCallback(async (id: string) => {
    const rows = await database.get('mediciones_crecimiento').query(Q.where('id_perfil', id), Q.sortBy('fecha_medicion', Q.desc), Q.take(8)).fetch();
    setHistorial(rows);
  }, []);

  useEffect(() => {
    perfilActivoId().then(id => { setPerfilId(id); if (id) cargar(id); });
  }, [cargar]);

  const guardar = async () => {
    if (!perfilId) return showToast('error', 'No hay un perfil de bebé activo.');
    const p = num(peso);
    if (!(p > 0.4 && p < 20)) return showToast('error', 'Escribe un peso válido en kg (ej. 4.2).');
    let t: number | undefined;
    if (talla.trim()) {
      t = num(talla);
      if (!(t >= 30 && t <= 120)) return showToast('error', 'La talla debe estar entre 30 y 120 cm.');
    }
    try {
      await database.write(async () => {
        await database.get('mediciones_crecimiento').create((m: any) => {
          m.idPerfil = perfilId; m.fechaMedicion = Date.now(); m.pesoKg = p;
          if (t !== undefined) m.longitudCm = t;
          m.fuente = 'manual'; m.isSynced = false;
        });
        const ctx = (await database.get('salud_contexto').query(Q.where('id_perfil', perfilId)).fetch())[0];
        if (ctx) await ctx.update((s: any) => { s.pesoKg = p; if (t !== undefined) s.tallaCm = t; });
      });
      setPeso(''); setTalla('');
      await cargar(perfilId);
      showToast('success', 'Peso guardado.');
    } catch (e: any) {
      showToast('error', 'No se pudo guardar: ' + (e?.message ?? e));
    }
  };

  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {ToastComponent}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={24} color={TC.textDark} /></TouchableOpacity>
        <Text style={s.title}>Registrar peso</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.label}>Peso (kg)</Text>
          <TextInput style={s.input} value={peso} onChangeText={setPeso} keyboardType="decimal-pad" placeholder="Ej. 4.2" />
          <Text style={s.label}>Talla (cm) — opcional</Text>
          <TextInput style={s.input} value={talla} onChangeText={setTalla} keyboardType="decimal-pad" placeholder="Ej. 55" />
          <TouchableOpacity style={s.btn} onPress={guardar}><Text style={s.btnText}>Guardar</Text></TouchableOpacity>
        </View>
        <View style={s.card}>
          <Text style={s.label}>Últimas mediciones</Text>
          {historial.length === 0 && <Text style={s.muted}>Aún no hay mediciones.</Text>}
          {historial.map(h => (
            <View key={h.id} style={s.row}>
              <Text style={s.muted}>{new Date(h.fechaMedicion).toLocaleDateString()}</Text>
              <Text style={s.val}>{h.pesoKg} kg{h.longitudCm ? `  ·  ${h.longitudCm} cm` : ''}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: TC.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: TC.textDark },
  card: { backgroundColor: TC.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: TC.inputBorder },
  label: { fontSize: 14, fontWeight: '700', color: TC.textDark, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, color: TC.textDark, marginBottom: 12 },
  btn: { backgroundColor: TC.vitalHeart, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  muted: { color: TC.textMuted, fontSize: 14 },
  val: { color: TC.textDark, fontWeight: '700', fontSize: 14 },
});
