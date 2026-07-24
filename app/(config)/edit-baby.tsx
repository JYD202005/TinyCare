import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { TC } from "@/components/theme";
import ComboDatePicker from "@/components/ComboDatePicker";
import { useToast } from "@/components/Toast";
import { database } from "@/src/database";
import { Perfil, DatosPersonales, SaludContexto, Cuidador, Emergencia, Dispositivo } from "@/src/database/models";

const SubformInput = ({ value, onChangeText, placeholder, keyboardType, style, containerStyle, maxLength }: any) => {
  return (
    <View style={[styles.inputFieldContainer, { backgroundColor: TC.card }, containerStyle]}>
      <Text style={styles.inputFieldLabel}>{placeholder}</Text>
      <TextInput
        style={[styles.inputFieldText, style]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={TC.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        placeholder={`Ingresa ${placeholder.toLowerCase()}`}
      />
    </View>
  );
};

export default function EditBabyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast, ToastComponent } = useToast();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  
  // Data States
  const [nombre, setNombre] = useState('');
  const [primerNombre, setPrimerNombre] = useState('');
  const [segundoNombre, setSegundoNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [sexo, setSexo] = useState('Femenino');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [avatar, setAvatar] = useState('❤️');
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [grupoSanguineo, setGrupoSanguineo] = useState('');
  const [grupoSanguineoOtro, setGrupoSanguineoOtro] = useState('');
  const [factorRh, setFactorRh] = useState('+');
  const [tieneAlergias, setTieneAlergias] = useState(false);
  const [detallesAlergias, setDetallesAlergias] = useState('');
  const [tieneComplicaciones, setTieneComplicaciones] = useState(false);
  const [detallesComplicaciones, setDetallesComplicaciones] = useState('');

  // Emergencias
  const [emergenciasList, setEmergenciasList] = useState<Emergencia[]>([]);
  const [emergenciaNombre, setEmergenciaNombre] = useState('');
  const [emergenciaLada, setEmergenciaLada] = useState('+52');
  const [emergenciaNumero, setEmergenciaNumero] = useState('');

  // Cuidadores
  const [cuidadoresList, setCuidadoresList] = useState<Cuidador[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cuidadorNombre, setCuidadorNombre] = useState('');
  const [cuidadorApellido, setCuidadorApellido] = useState('');
  const [cuidadorRol, setCuidadorRol] = useState('');
  const [cuidadorLada, setCuidadorLada] = useState('+52');
  const [cuidadorNumero, setCuidadorNumero] = useState('');

  // UI States
  const [showCuidadores, setShowCuidadores] = useState(false);
  const [showEmergencias, setShowEmergencias] = useState(false);
  const [showFormCuidador, setShowFormCuidador] = useState(false);
  const [showFormEmergencia, setShowFormEmergencia] = useState(false);
  const [editingCuidadorId, setEditingCuidadorId] = useState<string | null>(null);
  const [editingEmergenciaId, setEditingEmergenciaId] = useState<string | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const EMOJI_CATEGORIES = [
    { label: '👶 Bebés', emojis: ['👶','👶🏻','👶🏼','👶🏽','👶🏾','👶🏿','🍼','🐣','🐤','🦄','🦁','🦋'] },
    { label: '♥️ Corazones', emojis: ['❤️','🧡','💛','💚','💙','💜','🤍','🤎','🖤','💗','💘','💓','💕','💖','💞','💟','♥️','❣️'] },
    { label: '⭐ Estrellas', emojis: ['⭐','🌟','✨','💫','🌈','☀️','🌚','🌛','🌜','🌙','🪐','🔮'] },
    { label: '🌼 Naturaleza', emojis: ['🌼','🌸','🌺','🌷','🌶️','🌱','🌿','🍀','🍎','🍓','🍇','🍋','🍑','🥕','🌻'] },
    { label: '🐾 Animales', emojis: ['🐱','🐶','🐇','🐻','🐼','🐨','🦧','🐬','🦁','🦎','🐢','🐥','🦜','🐮','🦓'] },
    { label: '🌟 Otros', emojis: ['🛡️','🌈','🌍','🌞','🤘','👊','💪','🎉','🎁','🔔','📱','💊','🩺','🚑','⚕️'] },
  ];

  // Refs for models so we can update them
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [datosPersonales, setDatosPersonales] = useState<DatosPersonales | null>(null);
  const [salud, setSalud] = useState<SaludContexto | null>(null);

  useEffect(() => {
    if (!id) return;
    loadBabyData(id);
  }, [id]);

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const loadBabyData = async (perfilId: string) => {
    try {
      const p = await database.get<Perfil>('perfiles').find(perfilId);
      setPerfil(p);
      setNombre(p.nombreIdentificador || '');
      setAvatar(p.avatar || '❤️');

      const dpRecords = await database.get<DatosPersonales>('datos_personales').query().fetch();
      const dp = dpRecords.find(r => r.idPerfil === perfilId);
      if (dp) {
        setDatosPersonales(dp);
        setPrimerNombre(dp.primerNombre || p.nombreIdentificador || '');
        setSegundoNombre(dp.segundoNombre || '');
        setApellidoPaterno(dp.apellidoPaterno || '');
        setApellidoMaterno(dp.apellidoMaterno || '');
        setSexo(dp.sexo || 'Femenino');
        if (dp.fechaNacimiento) {
          const date = new Date(dp.fechaNacimiento);
          setFechaNacimiento(`${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`);
        }
      } else {
        setPrimerNombre(p.nombreIdentificador || '');
      }

      const scRecords = await database.get<SaludContexto>('salud_contexto').query().fetch();
      const sc = scRecords.find(r => r.idPerfil === perfilId);
      if (sc) {
        setSalud(sc);
        setPeso(sc.pesoKg ? String(sc.pesoKg) : '');
        setTalla(sc.tallaCm ? String(sc.tallaCm) : '');
        
        if (sc.grupoSanguineo && !['A', 'B', 'AB', 'O'].includes(sc.grupoSanguineo)) {
          setGrupoSanguineo('Otro');
          setGrupoSanguineoOtro(sc.grupoSanguineo);
        } else {
          setGrupoSanguineo(sc.grupoSanguineo || '');
        }

        setFactorRh(sc.factorRh || '+');
        setTieneAlergias(sc.tieneAlergias || false);
        setDetallesAlergias(sc.detallesAlergias || '');
        setTieneComplicaciones(sc.tieneComplicaciones || false);
        setDetallesComplicaciones(sc.detallesComplicaciones || '');
      }

      const emRecords = await database.get<Emergencia>('emergencias').query().fetch();
      setEmergenciasList(emRecords.filter(r => r.idPerfil === perfilId));

      const cuiRecords = await database.get<Cuidador>('cuidadores').query().fetch();
      setCuidadoresList(cuiRecords.filter(r => r.idPerfil === perfilId));

      setLoading(false);
    } catch (e) {
      console.log('Error loading baby data:', e);
      showToast('error', 'El perfil no existe o ha sido eliminado.');
      safeBack();
    }
  };

  const handleSave = async () => {
    if (!perfil) return;
    if (!nombre.trim()) {
      showToast('warning', 'El apodo del perfil no puede estar vacío.');
      return;
    }
    if (!primerNombre.trim()) {
      showToast('warning', 'El primer nombre no puede estar vacío.');
      return;
    }
    if (!apellidoPaterno.trim()) {
      showToast('warning', 'El apellido paterno no puede estar vacío.');
      return;
    }
    let fechaParsed = Date.now();
    if (fechaNacimiento) {
      const parts = fechaNacimiento.split('/');
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (dateObj > new Date()) {
          showToast('warning', 'La fecha de nacimiento no puede ser en el futuro.');
          return;
        }
        fechaParsed = dateObj.getTime();
      }
    }

    try {
      await database.write(async () => {
        // 1. Actualizar Perfil
        await perfil.update((p: any) => {
          p.nombreIdentificador = nombre.trim();
          p.avatar = avatar.trim() || '❤️';
        });

        // 2. Actualizar o CREAR DatosPersonales si no existen
        if (datosPersonales) {
          await datosPersonales.update((d: any) => {
            d.primerNombre = primerNombre.trim();
            d.segundoNombre = segundoNombre.trim();
            d.apellidoPaterno = apellidoPaterno.trim();
            d.apellidoMaterno = apellidoMaterno.trim();
            d.sexo = sexo;
            d.fechaNacimiento = fechaParsed;
          });
        } else {
          const newDp = await database.get<DatosPersonales>('datos_personales').create((d: any) => {
            d.idPerfil = perfil.id;
            d.primerNombre = primerNombre.trim();
            d.segundoNombre = segundoNombre.trim();
            d.apellidoPaterno = apellidoPaterno.trim();
            d.apellidoMaterno = apellidoMaterno.trim();
            d.sexo = sexo;
            d.fechaNacimiento = fechaParsed;
          });
          setDatosPersonales(newDp);
        }

        // 3. Actualizar o CREAR SaludContexto si no existe
        if (salud) {
          await salud.update((s: any) => {
            s.pesoKg = peso ? parseFloat(peso) : undefined;
            s.tallaCm = talla ? parseFloat(talla) : undefined;
            s.grupoSanguineo = grupoSanguineo === 'Otro' ? grupoSanguineoOtro.trim() : grupoSanguineo;
            s.factorRh = factorRh;
            s.tieneAlergias = tieneAlergias;
            s.detallesAlergias = detallesAlergias;
            s.tieneComplicaciones = tieneComplicaciones;
            s.detallesComplicaciones = detallesComplicaciones;
          });
        } else {
          const newSalud = await database.get<SaludContexto>('salud_contexto').create((s: any) => {
            s.idPerfil = perfil.id;
            s.pesoKg = peso ? parseFloat(peso) : undefined;
            s.tallaCm = talla ? parseFloat(talla) : undefined;
            s.grupoSanguineo = grupoSanguineo === 'Otro' ? grupoSanguineoOtro.trim() : grupoSanguineo;
            s.factorRh = factorRh;
            s.grupoEdad = 'Neonato';
            s.esPrematuro = false;
            s.altoRiesgoSdr = false;
            s.sospechaCardiopatia = false;
            s.tieneAlergias = tieneAlergias;
            s.detallesAlergias = detallesAlergias;
            s.tieneComplicaciones = tieneComplicaciones;
            s.detallesComplicaciones = detallesComplicaciones;
          });
          setSalud(newSalud);
        }
      });
      showToast('success', '¡Perfil guardado correctamente!');
      setTimeout(() => safeBack(), 800);
    } catch (e) {
      console.error('[handleSave]', e);
      showToast('error', 'Hubo un error al guardar los cambios.');
    }
  };

  const handleDeleteProfile = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteProfile = async () => {
    setShowDeleteModal(false);
    try {
      await database.write(async () => {
         if (datosPersonales) await datosPersonales.destroyPermanently();
         if (salud) await salud.destroyPermanently();
         for (const em of emergenciasList) await em.destroyPermanently();
         for (const cui of cuidadoresList) await cui.destroyPermanently();
         
         const dispositivos = await database.get<Dispositivo>('dispositivos').query().fetch();
         const dispositivosBebe = dispositivos.filter(d => d.idPerfil === id);
         for (const d of dispositivosBebe) await d.destroyPermanently();
         
         if (perfil) await perfil.destroyPermanently();
      });
      showToast("success", "Perfil eliminado correctamente");
      safeBack();
    } catch (e) {
      console.error('[confirmDeleteProfile]', e);
      showToast("error", "No se pudo eliminar el perfil");
    }
  };

  const SANGRE = ['A', 'B', 'AB', 'O', 'Otro'];

  const agregarEmergencia = async () => {
    const nombreTrimmed = emergenciaNombre.trim();
    const numeroTrimmed = emergenciaNumero.trim();
    const ladaLimpia = (emergenciaLada.trim() || '+52');

    if (!nombreTrimmed) {
      showToast('warning', 'Ingresa el nombre del contacto de emergencia.');
      return;
    }
    if (!numeroTrimmed) {
      showToast('warning', 'Ingresa el número de teléfono.');
      return;
    }
    if (!perfil) {
      showToast('error', 'No hay un perfil cargado. Intenta reabrir la pantalla.');
      return;
    }

    try {
      await database.write(async () => {
        if (editingEmergenciaId) {
          const emToUpdate = emergenciasList.find(e => e.id === editingEmergenciaId);
          if (emToUpdate) {
            await emToUpdate.update((e: any) => {
              e.nombreContacto = nombreTrimmed;
              e.lada = ladaLimpia;
              e.numero = parseInt(numeroTrimmed, 10) || 0;
            });
            setEmergenciasList(prev => prev.map(e => e.id === editingEmergenciaId ? emToUpdate : e));
          }
        } else {
          const newEm = await database.get<Emergencia>('emergencias').create((e: any) => {
            e.idPerfil = perfil.id;
            e.nombreContacto = nombreTrimmed;
            e.lada = ladaLimpia;
            e.numero = parseInt(numeroTrimmed, 10) || 0;
          });
          setEmergenciasList(prev => [...prev, newEm]);
        }
      });

      setEmergenciaNombre('');
      setEmergenciaLada('+52');
      setEmergenciaNumero('');
      setShowFormEmergencia(false);
      setEditingEmergenciaId(null);
      showToast('success', 'Contacto de emergencia guardado.');
    } catch(err) {
      console.error('[agregarEmergencia]', err);
      showToast('error', 'No se pudo guardar el contacto de emergencia.');
    }
  };

  const eliminarEmergencia = async (em: Emergencia) => {
    try {
      await database.write(async () => {
        await em.destroyPermanently();
        setEmergenciasList(prev => prev.filter(e => e.id !== em.id));
      });
    } catch(err) {}
  };

  const editarEmergencia = (em: Emergencia) => {
    setEditingEmergenciaId(em.id);
    setEmergenciaNombre(em.nombreContacto || '');
    setEmergenciaLada(em.lada || '+52');
    setEmergenciaNumero(em.numero ? String(em.numero) : '');
    setShowFormEmergencia(true);
  };

  const agregarCuidador = async () => {
    const nombreTrimmed = cuidadorNombre.trim();
    const numeroTrimmed = cuidadorNumero.trim();
    const ladaLimpia = (cuidadorLada.trim() || '+52');

    if (!nombreTrimmed) {
      showToast('warning', 'Ingresa el nombre del cuidador.');
      return;
    }
    if (!numeroTrimmed) {
      showToast('warning', 'Ingresa el número de teléfono.');
      return;
    }
    if (!perfil) {
      showToast('error', 'No hay un perfil cargado. Intenta reabrir la pantalla.');
      return;
    }

    try {
      await database.write(async () => {
        if (editingCuidadorId) {
          const cuiToUpdate = cuidadoresList.find(c => c.id === editingCuidadorId);
          if (cuiToUpdate) {
            await cuiToUpdate.update((c: any) => {
              c.primerNombre = nombreTrimmed;
              c.apellidoPaterno = cuidadorApellido.trim();
              c.rol = cuidadorRol.trim();
              c.lada = ladaLimpia;
              c.numero = parseInt(numeroTrimmed, 10) || 0;
            });
            setCuidadoresList(prev => prev.map(c => c.id === editingCuidadorId ? cuiToUpdate : c));
          }
        } else {
          const newCui = await database.get<Cuidador>('cuidadores').create((c: any) => {
            c.idPerfil = perfil.id;
            c.primerNombre = nombreTrimmed;
            c.apellidoPaterno = cuidadorApellido.trim();
            c.rol = cuidadorRol.trim();
            c.lada = ladaLimpia;
            c.numero = parseInt(numeroTrimmed, 10) || 0;
          });
          setCuidadoresList(prev => [...prev, newCui]);
        }
      });

      setCuidadorNombre('');
      setCuidadorApellido('');
      setCuidadorNumero('');
      setCuidadorLada('+52');
      setShowFormCuidador(false);
      setEditingCuidadorId(null);
      showToast('success', 'Cuidador guardado correctamente.');
    } catch(err) {
      console.error('[agregarCuidador]', err);
      showToast('error', 'No se pudo guardar el cuidador.');
    }
  };

  const eliminarCuidador = async (cui: Cuidador) => {
    try {
      await database.write(async () => {
        await cui.destroyPermanently();
        setCuidadoresList(prev => prev.filter(c => c.id !== cui.id));
      });
    } catch(err) {}
  };

  const editarCuidador = (cui: Cuidador) => {
    setEditingCuidadorId(cui.id);
    setCuidadorNombre(cui.primerNombre || '');
    setCuidadorApellido(cui.apellidoPaterno || '');
    setCuidadorRol(cui.rol || '');
    setCuidadorLada(cui.lada || '+52');
    setCuidadorNumero(cui.numero ? String(cui.numero) : '');
    setShowFormCuidador(true);
  };

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: TC.textMuted, fontSize: 16, fontWeight: '600' }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {ToastComponent}
      
      {/* Custom Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Ionicons name="warning" size={32} color={TC.vitalHeart} />
            </View>
            <Text style={styles.modalTitle}>Eliminar Perfil</Text>
            <Text style={styles.modalDesc}>
              ¿Estás seguro de que deseas eliminar el perfil de {nombre || 'este bebé'}? Esta acción no se puede deshacer y borrará permanentemente todo su historial médico y dispositivos.
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDelete} onPress={confirmDeleteProfile}>
                <Text style={styles.modalBtnDeleteText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.root}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={safeBack} style={styles.backCircle}>
              <Ionicons name="chevron-back" size={24} color={TC.textDark} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>Expediente Médico</Text>
            <Text style={styles.headerTitle}>Detalles del Bebé</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleSave} style={styles.saveCircle}>
              <Ionicons name="checkmark" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Avatar / Emoji Picker Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: TC.accent + '15' }]}>
                <Ionicons name="happy-outline" size={16} color={TC.accent} />
              </View>
              <Text style={styles.sectionTitle}>Identidad Visual</Text>
            </View>
            
            {/* Preview + toggle */}
            <TouchableOpacity
              onPress={() => setShowEmojiPicker(p => !p)}
              style={[
                styles.emojiSelectorButton,
                showEmojiPicker && { borderColor: TC.accent }
              ]}
            >
              <View style={styles.emojiAvatarWrapper}>
                <Text style={{ fontSize: 28 }}>{avatar || '❤️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emojiLabelTitle}>Emoji del perfil</Text>
                <Text style={styles.emojiLabelSubtitle}>
                  {showEmojiPicker ? 'Toca un emoji para seleccionarlo' : 'Toca para abrir el selector'}
                </Text>
              </View>
              <Ionicons name={showEmojiPicker ? 'chevron-up' : 'chevron-down'} size={20} color={TC.textMuted} />
            </TouchableOpacity>

            {/* Emoji Grid */}
            {showEmojiPicker && (
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
                          onPress={() => { setAvatar(emoji); setShowEmojiPicker(false); }}
                          style={[
                            styles.emojiItem,
                            avatar === emoji && styles.emojiItemActive
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
          </View>

          {/* Info Básica */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: TC.accent + '15' }]}>
                <Ionicons name="person-outline" size={16} color={TC.accent} />
              </View>
              <Text style={styles.sectionTitle}>Información Básica</Text>
            </View>
            <View style={styles.cardGroup}>
              <View style={{ padding: 16, paddingBottom: 0 }}>
                <View style={styles.inputFieldContainer}>
                  <Text style={styles.inputFieldLabel}>Apodo del perfil</Text>
                  <TextInput 
                    style={styles.inputFieldText} 
                    value={nombre} 
                    onChangeText={setNombre} 
                    placeholder="Ej. Josef" 
                    placeholderTextColor={TC.textMuted}
                  />
                </View>
              </View>

              <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <View style={styles.inputFieldContainer}>
                  <Text style={styles.inputFieldLabel}>Primer Nombre</Text>
                  <TextInput 
                    style={styles.inputFieldText} 
                    value={primerNombre} 
                    onChangeText={setPrimerNombre} 
                    placeholder="Nombre" 
                    placeholderTextColor={TC.textMuted} 
                  />
                </View>
                <View style={styles.inputFieldContainer}>
                  <Text style={styles.inputFieldLabel}>Segundo Nombre</Text>
                  <TextInput 
                    style={styles.inputFieldText} 
                    value={segundoNombre} 
                    onChangeText={setSegundoNombre} 
                    placeholder="Opcional" 
                    placeholderTextColor={TC.textMuted} 
                  />
                </View>
              </View>

              <View style={{ paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', gap: 12 }}>
                <View style={styles.inputFieldContainer}>
                  <Text style={styles.inputFieldLabel}>Apellido Paterno</Text>
                  <TextInput 
                    style={styles.inputFieldText} 
                    value={apellidoPaterno} 
                    onChangeText={setApellidoPaterno} 
                    placeholder="Paterno" 
                    placeholderTextColor={TC.textMuted} 
                  />
                </View>
                <View style={styles.inputFieldContainer}>
                  <Text style={styles.inputFieldLabel}>Apellido Materno</Text>
                  <TextInput 
                    style={styles.inputFieldText} 
                    value={apellidoMaterno} 
                    onChangeText={setApellidoMaterno} 
                    placeholder="Materno" 
                    placeholderTextColor={TC.textMuted} 
                  />
                </View>
              </View>
              
              <View style={styles.divider} />
              <View style={{ padding: 16 }}>
                <ComboDatePicker value={fechaNacimiento} onChange={setFechaNacimiento} />
              </View>
              <View style={styles.divider} />
              <View style={{ padding: 16 }}>
                <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Sexo</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity onPress={() => setSexo('Femenino')} style={[styles.chip, sexo === 'Femenino' && styles.chipActive]}>
                    <Text style={[styles.chipText, sexo === 'Femenino' && styles.chipTextActive]}>Femenino</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSexo('Masculino')} style={[styles.chip, sexo === 'Masculino' && styles.chipActive]}>
                    <Text style={[styles.chipText, sexo === 'Masculino' && styles.chipTextActive]}>Masculino</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSexo('No Especificado')} style={[styles.chip, sexo === 'No Especificado' && styles.chipActive]}>
                    <Text style={[styles.chipText, sexo === 'No Especificado' && styles.chipTextActive]}>No Especificado</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Datos Clínicos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: TC.accent + '15' }]}>
                <Ionicons name="scale-outline" size={16} color={TC.accent} />
              </View>
              <Text style={styles.sectionTitle}>Medidas y Sangre</Text>
            </View>
            <View style={styles.cardGroup}>
              <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <View style={styles.inputFieldContainer}>
                  <Text style={styles.inputFieldLabel}>Peso (kg)</Text>
                  <TextInput 
                    style={styles.inputFieldText} 
                    value={peso} 
                    onChangeText={setPeso} 
                    keyboardType="numeric" 
                    placeholder="Ej. 4.5" 
                    placeholderTextColor={TC.textMuted} 
                  />
                </View>
                <View style={styles.inputFieldContainer}>
                  <Text style={styles.inputFieldLabel}>Talla (cm)</Text>
                  <TextInput 
                    style={styles.inputFieldText} 
                    value={talla} 
                    onChangeText={setTalla} 
                    keyboardType="numeric" 
                    placeholder="Ej. 55" 
                    placeholderTextColor={TC.textMuted} 
                  />
                </View>
              </View>
              <View style={styles.divider} />
              <View style={{ padding: 16 }}>
                <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Grupo Sanguíneo</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SANGRE.map(s => (
                    <TouchableOpacity key={s} onPress={() => setGrupoSanguineo(s)} style={[styles.chip, grupoSanguineo === s && styles.chipActive]}>
                      <Text style={[styles.chipText, grupoSanguineo === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {grupoSanguineo === 'Otro' && (
                <View style={{ padding: 16, paddingTop: 0 }}>
                  <View style={styles.inputFieldContainer}>
                    <Text style={styles.inputFieldLabel}>Otro Grupo Sanguíneo</Text>
                    <TextInput 
                      style={styles.inputFieldText} 
                      value={grupoSanguineoOtro} 
                      onChangeText={setGrupoSanguineoOtro} 
                      placeholder="Especificar grupo..." 
                      placeholderTextColor={TC.textMuted}
                    />
                  </View>
                </View>
              )}
              <View style={styles.divider} />
              <View style={{ padding: 16 }}>
                <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Factor RH</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity onPress={() => setFactorRh('+')} style={[styles.chip, factorRh === '+' && styles.chipActive]}>
                    <Text style={[styles.chipText, factorRh === '+' && styles.chipTextActive]}>Positivo (+)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFactorRh('-')} style={[styles.chip, factorRh === '-' && styles.chipActive]}>
                    <Text style={[styles.chipText, factorRh === '-' && styles.chipTextActive]}>Negativo (-)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Salud Detalles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: TC.accent + '15' }]}>
                <Ionicons name="medical-outline" size={16} color={TC.accent} />
              </View>
              <Text style={styles.sectionTitle}>Detalles Médicos Críticos</Text>
            </View>
            <View style={styles.cardGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>¿Tiene alergias?</Text>
                <Switch 
                  value={tieneAlergias} 
                  onValueChange={setTieneAlergias} 
                  trackColor={{ true: TC.accent, false: TC.inputBorder }} 
                  thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
                />
              </View>
              {tieneAlergias && (
                <View style={{ padding: 16, paddingTop: 0 }}>
                  <View style={[styles.inputFieldContainer, { minHeight: 80 }]}>
                    <Text style={styles.inputFieldLabel}>Detalles de Alergias</Text>
                    <TextInput 
                      style={[styles.inputFieldText, { minHeight: 50, textAlignVertical: 'top' }]} 
                      value={detallesAlergias} 
                      onChangeText={setDetallesAlergias} 
                      placeholder="Describe las alergias..." 
                      placeholderTextColor={TC.textMuted}
                      multiline 
                    />
                  </View>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>¿Complicaciones al nacer?</Text>
                <Switch 
                  value={tieneComplicaciones} 
                  onValueChange={setTieneComplicaciones} 
                  trackColor={{ true: TC.accent, false: TC.inputBorder }} 
                  thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
                />
              </View>
              {tieneComplicaciones && (
                <View style={{ padding: 16, paddingTop: 0 }}>
                  <View style={[styles.inputFieldContainer, { minHeight: 80 }]}>
                    <Text style={styles.inputFieldLabel}>Detalles de Complicaciones</Text>
                    <TextInput 
                      style={[styles.inputFieldText, { minHeight: 50, textAlignVertical: 'top' }]} 
                      value={detallesComplicaciones} 
                      onChangeText={setDetallesComplicaciones} 
                      placeholder="Describe las complicaciones..." 
                      placeholderTextColor={TC.textMuted}
                      multiline 
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Cuidadores y Emergencia */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: TC.accent + '15' }]}>
                <Ionicons name="people-outline" size={16} color={TC.accent} />
              </View>
              <Text style={styles.sectionTitle}>Contactos y Red de Apoyo</Text>
            </View>
            <View style={styles.cardGroup}>
              
              {/* CUIDADORES HEADER */}
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => setShowCuidadores(!showCuidadores)}>
                <View style={styles.settingLeft}>
                  <Ionicons name="people" size={20} color={TC.accent} style={{ marginRight: 12 }} />
                  <Text style={styles.settingLabel}>Gestionar Cuidadores</Text>
                </View>
                <Ionicons name={showCuidadores ? "chevron-down" : "chevron-forward"} size={18} color={TC.textMuted} />
              </TouchableOpacity>
              
              {showCuidadores && (
                <View style={{ paddingBottom: 8 }}>
                  {cuidadoresList.length === 0 ? (
                    <View style={{ padding: 16, backgroundColor: TC.inputBg, marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: TC.inputBorder }}>
                      <Text style={{ color: TC.textMuted, fontSize: 13, textAlign: 'center', fontWeight: '500' }}>Aún no hay cuidadores agregados.</Text>
                    </View>
                  ) : (
                    cuidadoresList.map((cui) => (
                      <View key={cui.id} style={styles.contactCard}>
                        <View style={styles.settingLeft}>
                          <View style={styles.contactIconBox}>
                            <Ionicons name="person-outline" size={16} color={TC.accent} />
                          </View>
                          <View>
                            <Text style={styles.contactName}>{cui.primerNombre} {cui.apellidoPaterno}</Text>
                            <Text style={styles.contactRole}>{cui.rol} • {cui.lada} {cui.numero}</Text>
                          </View>
                        </View>
                        <View style={styles.contactActions}>
                          <TouchableOpacity onPress={() => editarCuidador(cui)} style={styles.contactActionBtn}>
                            <Ionicons name="pencil-outline" size={16} color={TC.textBody} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => eliminarCuidador(cui)} style={[styles.contactActionBtn, { backgroundColor: TC.vitalHeart + '10', borderColor: TC.vitalHeart + '25' }]}>
                            <Ionicons name="trash-outline" size={16} color={TC.vitalHeart} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  {!showFormCuidador ? (
                    <TouchableOpacity onPress={() => setShowFormCuidador(true)} style={styles.addContactCard}>
                      <Ionicons name="add-circle-outline" size={20} color={TC.accent} />
                      <Text style={styles.addContactText}>Añadir Cuidador</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.formContainer}>
                      <Text style={styles.formTitle}>
                        {editingCuidadorId ? 'Editar Cuidador' : 'Nuevo Cuidador'}
                      </Text>
                      <SubformInput value={cuidadorNombre} onChangeText={setCuidadorNombre} placeholder="Nombre" />
                      <SubformInput value={cuidadorApellido} onChangeText={setCuidadorApellido} placeholder="Apellidos" />
                      <SubformInput value={cuidadorRol} onChangeText={setCuidadorRol} placeholder="Parentesco (Ej. Madre)" />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <SubformInput value={cuidadorLada} onChangeText={setCuidadorLada} placeholder="Ej. +52" keyboardType="phone-pad" containerStyle={{ flex: 0.3 }} style={{ textAlign: 'center' }} />
                        <SubformInput value={cuidadorNumero} onChangeText={setCuidadorNumero} placeholder="Número de Teléfono" keyboardType="phone-pad" containerStyle={{ flex: 1 }} />
                      </View>
                      <View style={styles.formBtnRow}>
                        <TouchableOpacity 
                          onPress={() => {
                            setShowFormCuidador(false);
                            setEditingCuidadorId(null);
                            setCuidadorNombre('');
                            setCuidadorApellido('');
                            setCuidadorNumero('');
                          }} 
                          style={styles.formBtnCancel}
                        >
                          <Text style={styles.formBtnCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={agregarCuidador} style={styles.formBtnSave}>
                          <Text style={styles.formBtnSaveText}>Guardar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
              
              <View style={styles.divider} />

              {/* EMERGENCIAS HEADER */}
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => setShowEmergencias(!showEmergencias)}>
                <View style={styles.settingLeft}>
                  <Ionicons name="medical" size={20} color={TC.vitalHeart} style={{ marginRight: 12 }} />
                  <Text style={styles.settingLabel}>Contactos de Emergencia</Text>
                </View>
                <Ionicons name={showEmergencias ? "chevron-down" : "chevron-forward"} size={18} color={TC.textMuted} />
              </TouchableOpacity>

              {showEmergencias && (
                <View style={{ paddingBottom: 8 }}>
                  {emergenciasList.length === 0 ? (
                    <View style={{ padding: 16, backgroundColor: TC.inputBg, marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: TC.inputBorder }}>
                      <Text style={{ color: TC.textMuted, fontSize: 13, textAlign: 'center', fontWeight: '500' }}>Aún no hay contactos de emergencia.</Text>
                    </View>
                  ) : (
                    emergenciasList.map((em) => (
                      <View key={em.id} style={styles.contactCard}>
                        <View style={styles.settingLeft}>
                          <View style={[styles.contactIconBox, { backgroundColor: TC.vitalHeart + '08', borderColor: TC.vitalHeart + '20' }]}>
                            <Ionicons name="call-outline" size={16} color={TC.vitalHeart} />
                          </View>
                          <View>
                            <Text style={styles.contactName}>{em.nombreContacto}</Text>
                            <Text style={styles.contactRole}>{em.lada} {em.numero}</Text>
                          </View>
                        </View>
                        <View style={styles.contactActions}>
                          <TouchableOpacity onPress={() => editarEmergencia(em)} style={styles.contactActionBtn}>
                            <Ionicons name="pencil-outline" size={16} color={TC.textBody} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => eliminarEmergencia(em)} style={[styles.contactActionBtn, { backgroundColor: TC.vitalHeart + '10', borderColor: TC.vitalHeart + '25' }]}>
                            <Ionicons name="trash-outline" size={16} color={TC.vitalHeart} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  {!showFormEmergencia ? (
                    <TouchableOpacity onPress={() => setShowFormEmergencia(true)} style={[styles.addContactCard, { backgroundColor: TC.vitalHeart + '08', borderColor: TC.vitalHeart + '20' }]}>
                      <Ionicons name="add-circle-outline" size={20} color={TC.vitalHeart} />
                      <Text style={[styles.addContactText, { color: TC.vitalHeart }]}>Añadir Emergencia</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.formContainer}>
                      <Text style={styles.formTitle}>
                        {editingEmergenciaId ? 'Editar Emergencia' : 'Nuevo Contacto de Emergencia'}
                      </Text>
                      <SubformInput value={emergenciaNombre} onChangeText={setEmergenciaNombre} placeholder="Nombre del Contacto" />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <SubformInput value={emergenciaLada} onChangeText={setEmergenciaLada} placeholder="Ej. +52" keyboardType="phone-pad" containerStyle={{ flex: 0.3 }} style={{ textAlign: 'center' }} />
                        <SubformInput value={emergenciaNumero} onChangeText={setEmergenciaNumero} placeholder="Número de Teléfono" keyboardType="phone-pad" containerStyle={{ flex: 1 }} />
                      </View>
                      <View style={styles.formBtnRow}>
                        <TouchableOpacity 
                          onPress={() => {
                            setShowFormEmergencia(false);
                            setEditingEmergenciaId(null);
                            setEmergenciaNombre('');
                            setEmergenciaNumero('');
                          }} 
                          style={styles.formBtnCancel}
                        >
                          <Text style={styles.formBtnCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={agregarEmergencia} style={[styles.formBtnSave, { backgroundColor: TC.vitalHeart, shadowColor: TC.vitalHeart }]}>
                          <Text style={styles.formBtnSaveText}>Guardar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Zona de Peligro */}
          <View style={[styles.section, { marginTop: 24 }]}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteProfile}>
              <Ionicons name="trash-outline" size={20} color={TC.vitalHeart} />
              <Text style={styles.deleteBtnText}>Eliminar Perfil del Bebé</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TC.bg,
  },
  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder + '40',
    backgroundColor: TC.bg,
  },
  headerLeft: { width: 44 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { width: 44, alignItems: 'flex-end' },
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
  saveCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TC.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TC.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.4,
  },

  /* ── Scroll ── */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* ── Sections ── */
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous' as any,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.3,
  },

  /* ── Card Group ── */
  cardGroup: {
    backgroundColor: TC.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    overflow: 'hidden',
    borderCurve: 'continuous' as any,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },

  /* ── Input Fields ── */
  inputFieldContainer: {
    flex: 1,
    backgroundColor: TC.inputBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderCurve: 'continuous' as any,
  },
  inputFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TC.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputFieldText: {
    fontSize: 15,
    color: TC.textDark,
    fontWeight: '600',
    padding: 0,
  },

  /* ── Accordion Settings ── */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: TC.textDark,
  },

  /* ── Switch Row ── */
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TC.textDark,
    flex: 1,
  },

  /* ── Contact Card List ── */
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: TC.inputBg,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderCurve: 'continuous' as any,
  },
  contactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: TC.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderCurve: 'continuous' as any,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: TC.textDark,
  },
  contactRole: {
    fontSize: 12,
    color: TC.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: TC.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderCurve: 'continuous' as any,
  },

  /* ── Add Contact Action ── */
  addContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: TC.accentLight,
    borderWidth: 1.5,
    borderColor: TC.accent + '30',
    borderRadius: 18,
    borderStyle: 'dashed',
  },
  addContactText: {
    color: TC.accent,
    fontWeight: '700',
    fontSize: 14,
  },

  /* ── Subform Container ── */
  formContainer: {
    padding: 20,
    backgroundColor: TC.inputBg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TC.textDark,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  contactInput: {
    textAlign: 'left',
    backgroundColor: TC.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    fontSize: 15,
    color: TC.textDark,
    fontWeight: '600',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  formBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TC.trackBg,
    alignItems: 'center',
    borderCurve: 'continuous' as any,
  },
  formBtnCancelText: {
    color: TC.textBody,
    fontWeight: '700',
    fontSize: 14,
  },
  formBtnSave: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TC.accent,
    alignItems: 'center',
    borderCurve: 'continuous' as any,
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  formBtnSaveText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },

  /* ── Chips ── */
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: TC.inputBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
    borderCurve: 'continuous' as any,
  },
  chipActive: {
    backgroundColor: TC.accentLight,
    borderColor: TC.accent,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: TC.textMuted,
  },
  chipTextActive: {
    color: TC.accent,
  },

  /* ── Divider ── */
  divider: {
    height: 1,
    backgroundColor: TC.inputBorder,
    marginLeft: 16,
  },

  /* ── Emoji selector (matches onboarding.tsx) ── */
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
    marginTop: 12,
  },
  emojiCategoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: TC.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
    backgroundColor: TC.accentLight,
    borderColor: TC.accent,
  },

  /* ── Danger Zone ── */
  deleteBtn: {
    flexDirection: 'row',
    backgroundColor: TC.vitalHeart + '08',
    borderWidth: 1.5,
    borderColor: TC.vitalHeart + '20',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderCurve: 'continuous' as any,
  },
  deleteBtnText: {
    color: TC.vitalHeart,
    fontSize: 15,
    fontWeight: '800',
  },

  /* ── Modals ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderCurve: 'continuous' as any,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TC.vitalHeart + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TC.textDark,
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: TC.textBody,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TC.trackBg,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: TC.textBody,
  },
  modalBtnDelete: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TC.vitalHeart,
    alignItems: 'center',
    shadowColor: TC.vitalHeart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modalBtnDeleteText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
});
