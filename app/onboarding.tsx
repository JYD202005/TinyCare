import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '@/src/database/context';
// Native DateTimePicker removed: @react-native-community/datetimepicker@8.4.4 crashes
// on Hermes (RN 0.81+) because it mutates a frozen global Event prototype.
// Replaced with a pure-RN formatted text input.

import WaveHeader from '../components/WaveHeader';
import PillInput from '../components/PillInput';
import ComboDatePicker from '../components/ComboDatePicker';
import GradientButton from '../components/GradientButton';
import { TC } from '../components/theme';

interface Bebe {
  id: number;
  nombre: string;
  avatar: string;
  fechaNacimiento: string;
  peso: string;
  esPrematuro: boolean;
  semanasGestacion: string;
  riesgoSDR: boolean;
  mostrarAvanzado?: boolean;
}

const DEFAULT_EMOJIS = ['❤️', '✨', '🌟', '🍼', '🧸'];

const EMOJI_CATEGORIES = [
  { label: '👶 Bebés',     emojis: ['👶','👶🏻','👶🏼','👶🏽','👶🏾','👶🏿','🍼','🐣','🐤','🦄','🦁','🦋'] },
  { label: '♥️ Corazones', emojis: ['❤️','🧡','💛','💚','💙','💜','🤍','🤎','🖤','💗','💘','💓','💕','💖','💞','💟','♥️','❣️'] },
  { label: '⭐ Estrellas', emojis: ['⭐','🌟','✨','💫','🌈','☀️','🌚','🌛','🌜','🌙','🪐','🔮'] },
  { label: '🌼 Naturaleza',emojis: ['🌼','🌸','🌺','🌷','🌶️','🌱','🌿','🍀','🍎','🍓','🍇','🍋','🍑','🥕','🌻'] },
  { label: '🐾 Animales',  emojis: ['🐱','🐶','🐇','🐻','🐼','🐨','🦧','🐬','🦁','🦎','🐢','🐥','🦜','🐮','🦓'] },
  { label: '🌟 Otros',     emojis: ['🛡️','🌈','🌍','🌞','🤘','👊','💪','🎉','🎁','🔔','📱','💊','🩺','🚑','⚕️'] },
];

export default function Onboarding() {
  const database = useDatabase();
  const [step, setStep] = useState(1);
  const [bebes, setBebes] = useState<Bebe[]>([{ 
    id: 1, nombre: '', avatar: '❤️', fechaNacimiento: '', peso: '', esPrematuro: false, semanasGestacion: '', riesgoSDR: false, mostrarAvanzado: false 
  }]);
  // No native date picker state needed — using custom InlineDatePicker wheel
  const [showEmojiPickerId, setShowEmojiPickerId] = useState<number | null>(null);

  const agregarBebe = () => {
    const nextEmoji = DEFAULT_EMOJIS[bebes.length % DEFAULT_EMOJIS.length];
    setBebes([...bebes, { id: Date.now(), nombre: '', avatar: nextEmoji, fechaNacimiento: '', peso: '', esPrematuro: false, semanasGestacion: '', riesgoSDR: false, mostrarAvanzado: false }]);
  };

  const quitarBebe = (id: number) => {
    if (bebes.length > 1) {
      setBebes(bebes.filter(b => b.id !== id));
    }
  };

  const actualizarBebe = (id: number, campo: keyof Bebe, valor: any) => {
    setBebes(bebes.map(b => b.id === id ? { ...b, [campo]: valor } : b));
  };

  const guardarDatos = async () => {
    try {
      await database.write(async () => {
        for (const bebe of bebes) {
          if (!bebe.nombre.trim()) continue;

          const perfil = await database.get('perfiles').create((p: any) => {
            p.nombreIdentificador = bebe.nombre;
            p.avatar = bebe.avatar;
            p.idUsuarioRemote = 'local';
          });

          let fechaParsed = new Date();
          if (bebe.fechaNacimiento) {
            const parts = bebe.fechaNacimiento.split('/');
            if (parts.length === 3) {
              fechaParsed = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            }
          }

          await database.get('datos_personales').create((d: any) => {
            d.idPerfil = perfil.id;
            d.primerNombre = bebe.nombre;
            d.sexo = 'No Especificado';
            d.fechaNacimiento = fechaParsed.getTime();
          });

          const now = new Date();
          const diasDeVida = Math.floor((now.getTime() - fechaParsed.getTime()) / (1000 * 60 * 60 * 24));
          let grupoEdad = 'Nino';
          if (diasDeVida <= 28) grupoEdad = 'Neonato';
          else if (diasDeVida <= 365) grupoEdad = 'Lactante';

          await database.get('salud_contexto').create((s: any) => {
            s.idPerfil = perfil.id;
            s.pesoKg = parseFloat(bebe.peso) || null;
            s.esPrematuro = bebe.esPrematuro;
            s.altoRiesgoSdr = bebe.riesgoSDR;
            s.sospechaCardiopatia = false;
            s.grupoEdad = grupoEdad;
            s.diasDeVida = diasDeVida >= 0 ? diasDeVida : 0;
            s.edadGestacionalSemanas = bebe.esPrematuro ? (parseInt(bebe.semanasGestacion) || null) : null;
          });
        }
      });
      
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error("Error guardando datos iniciales", error);
    }
  };

  return (
    <View style={styles.root}>
      <WaveHeader height={300} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Image 
                source={require('../assets/logo.jpeg')} 
                style={{ width: 128, height: 128, marginTop: 18 }} 
                resizeMode="cover" 
              />
            </View>
          </View>

          <View style={styles.formSection}>
            {step === 1 ? (
              <View>
                <Text style={styles.greeting}>¡Bienvenido!</Text>
                <Text style={styles.subtitle}>
                  El monitor inteligente para los más pequeños. Funciona sin conexión, protege tu privacidad y sin obligarte a crear cuentas.
                </Text>
                
                <GradientButton
                  label="CONFIGURACIÓN RÁPIDA"
                  onPress={() => setStep(2)}
                  style={styles.mainBtn}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.greeting}>¿A quién vamos a cuidar?</Text>
                <Text style={styles.subtitle}>
                  Para protegerlos mejor, necesitamos datos precisos para calibrar las alertas médicas.
                </Text>

                {bebes.map((bebe, index) => (
                  <View key={bebe.id} style={styles.bebeCard}>
                    <View style={styles.bebeHeader}>
                      <Text style={styles.bebeLabel}>BEBÉ {index + 1}</Text>
                      {bebes.length > 1 && (
                        <TouchableOpacity onPress={() => quitarBebe(bebe.id)}>
                          <Ionicons name="close" size={24} color={TC.textBody} />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* ── Emoji Picker (mismo que edit-baby) ── */}
                    <TouchableOpacity
                      onPress={() => setShowEmojiPickerId(showEmojiPickerId === bebe.id ? null : bebe.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 16,
                        backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14,
                        borderWidth: 1.5,
                        borderColor: showEmojiPickerId === bebe.id ? TC.accent : TC.inputBorder,
                        marginBottom: 8,
                      }}
                    >
                      <View style={{
                        width: 56, height: 56, borderRadius: 28,
                        backgroundColor: '#FFF5F7', borderWidth: 2, borderColor: TC.accent,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 32 }}>{bebe.avatar || '❤️'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', color: TC.textDark, fontSize: 14 }}>Icono del bebé</Text>
                        <Text style={{ color: TC.textMuted, fontSize: 12, marginTop: 2 }}>
                          {showEmojiPickerId === bebe.id ? 'Toca un emoji para seleccionarlo' : 'Toca para abrir el selector'}
                        </Text>
                      </View>
                      <Ionicons
                        name={showEmojiPickerId === bebe.id ? 'chevron-up' : 'chevron-down'}
                        size={20} color={TC.textMuted}
                      />
                    </TouchableOpacity>

                    {showEmojiPickerId === bebe.id && (
                      <View style={{
                        marginBottom: 12, backgroundColor: '#F8FAFC',
                        borderRadius: 16, padding: 12,
                        borderWidth: 1, borderColor: TC.inputBorder,
                      }}>
                        {EMOJI_CATEGORIES.map(cat => (
                          <View key={cat.label} style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 11, color: TC.textMuted, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 }}>
                              {cat.label.toUpperCase()}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {cat.emojis.map(emoji => (
                                <TouchableOpacity
                                  key={emoji}
                                  onPress={() => {
                                    actualizarBebe(bebe.id, 'avatar', emoji);
                                    setShowEmojiPickerId(null);
                                  }}
                                  style={{
                                    width: 44, height: 44, borderRadius: 22,
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2,
                                    backgroundColor: bebe.avatar === emoji ? '#FFF5F7' : '#FFF',
                                    borderColor: bebe.avatar === emoji ? TC.accent : TC.inputBorder,
                                  }}
                                >
                                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    <PillInput
                      icon="person-outline"
                      placeholder="Nombre o apodo"
                      value={bebe.nombre}
                      onChangeText={(t) => actualizarBebe(bebe.id, 'nombre', t)}
                      containerStyle={styles.inputSpacing}
                    />

                    <ComboDatePicker
                      value={bebe.fechaNacimiento}
                      onChange={(t) => actualizarBebe(bebe.id, 'fechaNacimiento', t)}
                    />

                    <PillInput
                      icon="scale-outline"
                      placeholder="Peso actual (kg)"
                      keyboardType="numeric"
                      value={bebe.peso}
                      onChangeText={(t) => actualizarBebe(bebe.id, 'peso', t)}
                      containerStyle={styles.inputSpacing}
                    />

                    <TouchableOpacity 
                      style={styles.advancedToggle} 
                      onPress={() => actualizarBebe(bebe.id, 'mostrarAvanzado', !bebe.mostrarAvanzado)}
                    >
                      <Ionicons name={bebe.mostrarAvanzado ? "chevron-up" : "chevron-down"} size={20} color={TC.accent} />
                      <Text style={styles.advancedText}>Condiciones Médicas (Opcional)</Text>
                    </TouchableOpacity>

                    {bebe.mostrarAvanzado && (
                      <View style={styles.advancedSection}>
                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>¿Nació prematuro?</Text>
                          <Switch 
                            value={bebe.esPrematuro} 
                            onValueChange={(v) => actualizarBebe(bebe.id, 'esPrematuro', v)} 
                            trackColor={{ true: TC.accent, false: '#CBD5E1' }}
                          />
                        </View>

                        {bebe.esPrematuro && (
                          <PillInput
                            icon="time-outline"
                            placeholder="Semanas de gestación"
                            keyboardType="numeric"
                            value={bebe.semanasGestacion}
                            onChangeText={(t) => actualizarBebe(bebe.id, 'semanasGestacion', t)}
                            containerStyle={styles.inputSpacing}
                          />
                        )}

                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>Alto riesgo respiratorio (SDR)</Text>
                          <Switch 
                            value={bebe.riesgoSDR} 
                            onValueChange={(v) => actualizarBebe(bebe.id, 'riesgoSDR', v)} 
                            trackColor={{ true: TC.accent, false: '#CBD5E1' }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                ))}

                <TouchableOpacity style={styles.addBtn} onPress={agregarBebe}>
                  <Ionicons name="add-circle-outline" size={20} color={TC.accent} />
                  <Text style={styles.addText}>Añadir otro bebé</Text>
                </TouchableOpacity>

                <GradientButton
                  label="¡TODO LISTO!"
                  onPress={guardarDatos}
                  style={styles.mainBtn}
                />
              </View>
            )}
          </View>

          <Text style={styles.footer}>
            Acompañando a tu bebé, en cada latido
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ───────────── Styles ───────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TC.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  logoArea: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 80 : 64,
    marginBottom: 8,
    zIndex: 10,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  formSection: {
    paddingHorizontal: 28,
    paddingTop: 80,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: TC.textDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: TC.textBody,
    marginBottom: 32,
    lineHeight: 24,
  },
  inputSpacing: {
    marginBottom: 16,
  },
  bebeCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bebeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bebeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TC.accent,
    letterSpacing: 1,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    paddingVertical: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: TC.textBody,
    fontWeight: '500',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  advancedText: {
    fontSize: 14,
    color: TC.accent,
    fontWeight: '600',
    marginLeft: 8,
  },
  advancedSection: {
    paddingTop: 12,
  },
  addText: {
    fontSize: 15,
    fontWeight: '600',
    color: TC.accent,
  },
  mainBtn: {
    marginTop: 16,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    color: TC.accent,
    marginTop: 'auto',
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
});
