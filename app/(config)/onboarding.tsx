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
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '@/src/database/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PillInput from '@/components/PillInput';
import ComboDatePicker from '@/components/ComboDatePicker';
import GradientButton from '@/components/GradientButton';
import { TC } from '@/components/theme';
import { useToast } from '@/components/Toast';
import { notifyCommon } from '@/src/services/notifications/NotificationService';

interface Bebe {
  id: number;
  nombre: string;
  avatar: string;
  fechaNacimiento: string;
  peso: string;
  esPrematuro: boolean;
  semanasGestacion: string;
  riesgoSDR: boolean;
  tieneComplicaciones: boolean;
  detallesComplicaciones: string;
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
  const { showToast, ToastComponent } = useToast();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [bebes, setBebes] = useState<Bebe[]>([{ 
    id: 1, nombre: '', avatar: '❤️', fechaNacimiento: '', peso: '', esPrematuro: false, semanasGestacion: '', riesgoSDR: false, tieneComplicaciones: false, detallesComplicaciones: '', mostrarAvanzado: false 
  }]);
  const [showEmojiPickerId, setShowEmojiPickerId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const agregarBebe = () => {
    const nextEmoji = DEFAULT_EMOJIS[bebes.length % DEFAULT_EMOJIS.length];
    setBebes([...bebes, { id: Date.now(), nombre: '', avatar: nextEmoji, fechaNacimiento: '', peso: '', esPrematuro: false, semanasGestacion: '', riesgoSDR: false, tieneComplicaciones: false, detallesComplicaciones: '', mostrarAvanzado: false }]);
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
    for (let i = 0; i < bebes.length; i++) {
      const bebe = bebes[i];
      if (!bebe.nombre.trim()) {
        showToast("warning", `Ingresa el nombre del bebé ${i+1}.`);
        return;
      }
      if (!bebe.fechaNacimiento.trim()) {
        showToast("warning", `Ingresa la fecha de nacimiento para ${bebe.nombre}.`);
        return;
      }
      if (!bebe.peso.trim()) {
        showToast("warning", `Ingresa el peso para ${bebe.nombre}.`);
        return;
      }

      const parts = bebe.fechaNacimiento.split('/');
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (dateObj > new Date()) {
          showToast("warning", `La fecha de nacimiento para ${bebe.nombre} no puede ser en el futuro.`);
          return;
        }
      }
    }

    try {
      const addedNames: string[] = [];

      await database.write(async () => {
        for (const bebe of bebes) {
          if (!bebe.nombre.trim()) continue;
          addedNames.push(bebe.nombre.trim());

          const perfil = await database.get('perfiles').create((p: any) => {
            p.nombreIdentificador = bebe.nombre.trim();
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
            d.primerNombre = bebe.nombre.trim();
            d.apellidoPaterno = ''; 
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
            s.tieneComplicaciones = bebe.tieneComplicaciones;
            s.detallesComplicaciones = bebe.detallesComplicaciones.trim();
          });

          await database.get('alertas_medicas').create((a: any) => {
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
        await notifyCommon("Nuevo bebé registrado", `El perfil de ${name} está listo en TinyCare.`);
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Image 
                source={require('@/assets/logo.jpeg')} 
                style={styles.logoImage} 
                resizeMode="cover" 
              />
            </View>
            <Text style={styles.appName}>TinyCare</Text>
            <Text style={styles.appTagline}>Vigilancia Pediátrica Inteligente</Text>
          </View>

          {step === 1 ? (
            /* Step 1: Welcome */
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: TC.accent + '15' }]}>
                  <Ionicons name="sparkles" size={18} color={TC.accent} />
                </View>
                <Text style={styles.cardTitle}>¡Bienvenido!</Text>
              </View>
              
              <Text style={styles.paragraph}>
                El monitor inteligente para los más pequeños. Funciona sin conexión, protege tu privacidad y te acompaña sin obligarte a crear cuentas molestas.
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
                  Necesitamos algunos datos iniciales para calibrar correctamente las alertas médicas de tus bebés.
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
                  
                  {/* Emoji Avatar Selector */}
                  <TouchableOpacity
                    onPress={() => setShowEmojiPickerId(showEmojiPickerId === bebe.id ? null : bebe.id)}
                    style={[
                      styles.emojiSelectorButton,
                      showEmojiPickerId === bebe.id && { borderColor: TC.accent }
                    ]}
                  >
                    <View style={styles.emojiAvatarWrapper}>
                      <Text style={{ fontSize: 28 }}>{bebe.avatar || '❤️'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emojiLabelTitle}>Icono del bebé</Text>
                      <Text style={styles.emojiLabelSubtitle}>
                        {showEmojiPickerId === bebe.id ? 'Selecciona un emoji' : 'Toca para cambiar'}
                      </Text>
                    </View>
                    <Ionicons
                      name={showEmojiPickerId === bebe.id ? 'chevron-up' : 'chevron-down'}
                      size={20} 
                      color={TC.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Emoji Dropdown list */}
                  {showEmojiPickerId === bebe.id && (
                    <View style={styles.emojiDropdown}>
                      {EMOJI_CATEGORIES.map(cat => (
                        <View key={cat.label} style={{ gap: 6 }}>
                          <Text style={styles.emojiCategoryLabel}>
                            {cat.label.toUpperCase()}
                          </Text>
                          <View style={styles.emojiGrid}>
                            {cat.emojis.map(emoji => (
                              <TouchableOpacity
                                key={emoji}
                                onPress={() => {
                                  actualizarBebe(bebe.id, 'avatar', emoji);
                                  setShowEmojiPickerId(null);
                                }}
                                style={[
                                  styles.emojiItem,
                                  bebe.avatar === emoji && styles.emojiItemActive
                                ]}
                              >
                                <Text style={{ fontSize: 22 }}>{emoji}</Text>
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
                  />

                  {/* Advanced Toggle */}
                  <TouchableOpacity 
                    style={styles.advancedToggle} 
                    onPress={() => actualizarBebe(bebe.id, 'mostrarAvanzado', !bebe.mostrarAvanzado)}
                  >
                    <Ionicons name={bebe.mostrarAvanzado ? "chevron-up" : "chevron-down"} size={18} color={TC.accent} />
                    <Text style={styles.advancedText}>Condiciones Médicas (Opcional)</Text>
                  </TouchableOpacity>

                  {bebe.mostrarAvanzado && (
                    <View style={styles.advancedSection}>
                      <View style={styles.switchCardRow}>
                        <Text style={styles.switchLabel}>¿Nació prematuro?</Text>
                        <Switch 
                          value={bebe.esPrematuro} 
                          onValueChange={(v) => actualizarBebe(bebe.id, 'esPrematuro', v)} 
                          trackColor={{ true: TC.accent, false: '#CBD5E1' }}
                          thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
                        />
                      </View>

                      {bebe.esPrematuro && (
                        <PillInput
                          icon="time-outline"
                          placeholder="Semanas de gestación"
                          keyboardType="numeric"
                          value={bebe.semanasGestacion}
                          onChangeText={(t) => actualizarBebe(bebe.id, 'semanasGestacion', t)}
                        />
                      )}

                      <View style={styles.switchCardRow}>
                        <Text style={styles.switchLabel}>Riesgo de SDR respiratorio</Text>
                        <Switch 
                          value={bebe.riesgoSDR} 
                          onValueChange={(v) => actualizarBebe(bebe.id, 'riesgoSDR', v)} 
                          trackColor={{ true: TC.accent, false: '#CBD5E1' }}
                          thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
                        />
                      </View>

                      <View style={styles.switchCardRow}>
                        <Text style={styles.switchLabel}>¿Otros padecimientos?</Text>
                        <Switch 
                          value={bebe.tieneComplicaciones} 
                          onValueChange={(v) => actualizarBebe(bebe.id, 'tieneComplicaciones', v)} 
                          trackColor={{ true: TC.accent, false: '#CBD5E1' }}
                          thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
                        />
                      </View>

                      {bebe.tieneComplicaciones && (
                        <PillInput
                          icon="medkit-outline"
                          placeholder="Describe el padecimiento..."
                          value={bebe.detallesComplicaciones}
                          onChangeText={(t) => actualizarBebe(bebe.id, 'detallesComplicaciones', t)}
                        />
                      )}
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

            <Text style={styles.modalTitle}>
              ¡Casi listo!
            </Text>
            
            <Text style={styles.modalParagraph}>
              Has creado el perfil básico de tu bebé. Para completar toda la información clínica, dirígete a la sección de <Text style={{fontWeight: '800', color: TC.textDark}}>Perfiles</Text> en la app.
            </Text>

            <View style={styles.modalTipContainer}>
               <View style={styles.modalTipIcon}>
                 <Ionicons name="person-circle" size={24} color={TC.accent} />
               </View>
               <Text style={styles.modalTipText}>
                 Ahí podrás configurar sus apellidos, sexo y detalles adicionales para asegurar la precisión del sistema de monitoreo.
               </Text>
            </View>

            <GradientButton
              label="¡ENTENDIDO!"
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)/home');
              }}
              style={{ width: '100%' }}
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
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: TC.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
    overflow: 'hidden',
  },
  logoImage: {
    width: 130,
    height: 130,
    marginTop: 18,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: TC.textDark,
    letterSpacing: -0.6,
    marginTop: 16,
  },
  appTagline: {
    fontSize: 12,
    fontWeight: '700',
    color: TC.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
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
    fontSize: 18,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.4,
  },
  paragraph: {
    fontSize: 15,
    color: TC.textBody,
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 24,
  },
  step2Header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: TC.textBody,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  bebeCard: {
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
    gap: 16,
  },
  bebeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
    paddingBottom: 14,
    marginBottom: 4,
  },
  bebeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: TC.accent,
    letterSpacing: 1.2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TC.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  emojiSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiLabelTitle: {
    fontWeight: '700',
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
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: TC.card,
    borderColor: TC.inputBorder,
  },
  emojiItemActive: {
    borderColor: TC.accent,
    backgroundColor: TC.accent + '10',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
  },
  advancedSection: {
    gap: 16,
    paddingTop: 4,
  },
  switchCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: TC.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: TC.accent,
    borderStyle: 'dashed',
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  addText: {
    fontSize: 15,
    fontWeight: '700',
    color: TC.accent,
  },
  mainBtn: {
    width: '100%',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: TC.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 'auto',
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61,44,46,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: TC.card,
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
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
    backgroundColor: TC.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderCurve: 'continuous' as any,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TC.textDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalParagraph: {
    fontSize: 15,
    color: TC.textBody,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalTipContainer: {
    backgroundColor: TC.inputBg,
    borderRadius: 20,
    padding: 16,
    width: '100%',
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
  },
});
