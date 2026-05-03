import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { TC } from "../components/theme";
import ComboDatePicker from "../components/ComboDatePicker";
import { useToast } from "../components/Toast";
import { database } from "../src/database";
import { Perfil, DatosPersonales, SaludContexto, Cuidador, Emergencia } from "../src/database/models";

const FloatingInput = ({ value, onChangeText, placeholder, keyboardType, style, containerStyle, maxLength }: any) => {
  const isFocusedOrFilled = Boolean(value && value.toString().length > 0);
  return (
    <View style={[{ marginBottom: 8 }, containerStyle]}>
      {isFocusedOrFilled ? (
        <Text style={{ position: 'absolute', top: 4, left: 10, fontSize: 10, color: TC.textMuted, zIndex: 1 }}>
          {placeholder}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.contactInput,
          isFocusedOrFilled && { paddingTop: 20, paddingBottom: 4 },
          style
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TC.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
};



export default function EditBabyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast, ToastComponent } = useToast();

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
      console.error(e);
      showToast('error', 'No se pudieron cargar los datos.');
      router.back();
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
    try {
      await database.write(async () => {
        // 1. Actualizar Perfil
        await perfil.update((p: any) => {
          p.nombreIdentificador = nombre.trim();
          p.avatar = avatar.trim() || '❤️';
        });

        // Parse DD/MM/YYYY to timestamp
        let fechaParsed = Date.now();
        if (fechaNacimiento) {
          const parts = fechaNacimiento.split('/');
          if (parts.length === 3) {
            fechaParsed = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
          }
        }

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
      setTimeout(() => router.back(), 800);
    } catch (e) {
      console.error('[handleSave]', e);
      showToast('error', 'Hubo un error al guardar los cambios.');
    }
  };

  // Removed AVATARS array, user inputs custom emoji
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
    return <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}><Text>Cargando...</Text></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Toast banners — flotan sobre todo el contenido */}
      {ToastComponent}
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={TC.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expediente Detallado</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Guardar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Avatar / Emoji Picker Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Icono del Perfil</Text>
            
            {/* Preview + toggle */}
            <TouchableOpacity
              onPress={() => setShowEmojiPicker(p => !p)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 16,
                backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16,
                borderWidth: 1.5, borderColor: showEmojiPicker ? TC.accent : TC.inputBorder,
              }}
            >
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: '#FFF5F7', borderWidth: 2, borderColor: TC.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 38 }}>{avatar || '❤️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: TC.textDark, fontSize: 15 }}>Emoji del perfil</Text>
                <Text style={{ color: TC.textMuted, fontSize: 12, marginTop: 2 }}>
                  {showEmojiPicker ? 'Toca un emoji para seleccionarlo' : 'Toca para abrir el selector'}
                </Text>
              </View>
              <Ionicons name={showEmojiPicker ? 'chevron-up' : 'chevron-down'} size={20} color={TC.textMuted} />
            </TouchableOpacity>

            {/* Emoji Grid */}
            {showEmojiPicker && (
              <View style={{ marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }}>
                {EMOJI_CATEGORIES.map(cat => (
                  <View key={cat.label} style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: TC.textMuted, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 }}>
                      {cat.label.toUpperCase()}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {cat.emojis.map(emoji => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => { setAvatar(emoji); setShowEmojiPicker(false); }}
                          style={[
                            {
                              width: 44, height: 44, borderRadius: 22,
                              alignItems: 'center', justifyContent: 'center',
                              borderWidth: 2,
                              backgroundColor: avatar === emoji ? '#FFF5F7' : '#FFF',
                              borderColor: avatar === emoji ? TC.accent : TC.inputBorder,
                            }
                          ]}
                        >
                          <Text style={{ fontSize: 24 }}>{emoji}</Text>
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
            <Text style={styles.sectionTitle}>Información Básica</Text>
            <View style={styles.cardGroup}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Nombre o Apodo</Text>
                <TextInput style={styles.textInput} value={nombre} onChangeText={setNombre} placeholder="Ej. Josef" />
              </View>
              <View style={styles.divider} />

              <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }}>
                  <Text style={[styles.inputLabel, { marginBottom: 4, fontSize: 11, color: TC.textMuted }]}>PRIMER NOMBRE</Text>
                  <TextInput style={{ textAlign: 'left', fontSize: 15, color: TC.textDark, fontWeight: '500' }} value={primerNombre} onChangeText={setPrimerNombre} placeholder="Nombre" placeholderTextColor="#CBD5E1" />
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }}>
                  <Text style={[styles.inputLabel, { marginBottom: 4, fontSize: 11, color: TC.textMuted }]}>SEGUNDO NOMBRE</Text>
                  <TextInput style={{ textAlign: 'left', fontSize: 15, color: TC.textDark, fontWeight: '500' }} value={segundoNombre} onChangeText={setSegundoNombre} placeholder="Opcional" placeholderTextColor="#CBD5E1" />
                </View>
              </View>

              <View style={{ paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }}>
                  <Text style={[styles.inputLabel, { marginBottom: 4, fontSize: 11, color: TC.textMuted }]}>APELLIDO PATERNO</Text>
                  <TextInput style={{ textAlign: 'left', fontSize: 15, color: TC.textDark, fontWeight: '500' }} value={apellidoPaterno} onChangeText={setApellidoPaterno} placeholder="Paterno" placeholderTextColor="#CBD5E1" />
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }}>
                  <Text style={[styles.inputLabel, { marginBottom: 4, fontSize: 11, color: TC.textMuted }]}>APELLIDO MATERNO</Text>
                  <TextInput style={{ textAlign: 'left', fontSize: 15, color: TC.textDark, fontWeight: '500' }} value={apellidoMaterno} onChangeText={setApellidoMaterno} placeholder="Materno" placeholderTextColor="#CBD5E1" />
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
            <Text style={styles.sectionTitle}>Medidas y Sangre</Text>
            <View style={styles.cardGroup}>
              <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }}>
                  <Text style={[styles.inputLabel, { marginBottom: 4, fontSize: 11, color: TC.textMuted }]}>PESO (KG)</Text>
                  <TextInput style={{ textAlign: 'left', fontSize: 15, color: TC.textDark, fontWeight: '500' }} value={peso} onChangeText={setPeso} keyboardType="numeric" placeholder="Ej. 4.5" placeholderTextColor="#CBD5E1" />
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }}>
                  <Text style={[styles.inputLabel, { marginBottom: 4, fontSize: 11, color: TC.textMuted }]}>TALLA (CM)</Text>
                  <TextInput style={{ textAlign: 'left', fontSize: 15, color: TC.textDark, fontWeight: '500' }} value={talla} onChangeText={setTalla} keyboardType="numeric" placeholder="Ej. 55" placeholderTextColor="#CBD5E1" />
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
                  <TextInput 
                    style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder, fontSize: 15, color: TC.textDark, fontWeight: '500' }} 
                    value={grupoSanguineoOtro} 
                    onChangeText={setGrupoSanguineoOtro} 
                    placeholder="Especificar grupo sanguíneo raro..." 
                    placeholderTextColor="#CBD5E1"
                  />
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
            <Text style={styles.sectionTitle}>Detalles Médicos Críticos</Text>
            <View style={styles.cardGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>¿Tiene alergias?</Text>
                <Switch value={tieneAlergias} onValueChange={setTieneAlergias} trackColor={{ true: TC.accent }} />
              </View>
              {tieneAlergias && (
                <View style={{ padding: 16, paddingTop: 0 }}>
                  <TextInput 
                    style={[styles.textArea, { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }]} 
                    value={detallesAlergias} 
                    onChangeText={setDetallesAlergias} 
                    placeholder="Describe las alergias..." 
                    placeholderTextColor="#CBD5E1"
                    multiline 
                  />
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>¿Complicaciones al nacer?</Text>
                <Switch value={tieneComplicaciones} onValueChange={setTieneComplicaciones} trackColor={{ true: TC.accent }} />
              </View>
              {tieneComplicaciones && (
                <View style={{ padding: 16, paddingTop: 0 }}>
                  <TextInput 
                    style={[styles.textArea, { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TC.inputBorder }]} 
                    value={detallesComplicaciones} 
                    onChangeText={setDetallesComplicaciones} 
                    placeholder="Describe las complicaciones..." 
                    placeholderTextColor="#CBD5E1"
                    multiline 
                  />
                </View>
              )}
            </View>
          </View>

          {/* Cuidadores y Emergencia */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contactos y Red de Apoyo</Text>
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
                <View>
                  {cuidadoresList.length === 0 ? (
                    <View style={{ padding: 16, backgroundColor: '#F8FAFC' }}>
                      <Text style={{ color: TC.textMuted, fontSize: 13, textAlign: 'center' }}>Aún no hay cuidadores agregados.</Text>
                    </View>
                  ) : (
                    cuidadoresList.map((cui) => (
                      <View key={cui.id}>
                        <View style={[styles.settingRow, { backgroundColor: '#F8FAFC' }]}>
                          <View style={styles.settingLeft}>
                            <Ionicons name="person" size={16} color={TC.textMuted} style={{ marginRight: 12, marginLeft: 16 }} />
                            <View>
                              <Text style={styles.settingLabel}>{cui.primerNombre} {cui.apellidoPaterno} ({cui.rol})</Text>
                              <Text style={{ color: TC.textMuted, fontSize: 13 }}>{cui.lada} {cui.numero}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={() => editarCuidador(cui)} style={{ padding: 8 }}>
                              <Ionicons name="pencil" size={20} color={TC.textMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => eliminarCuidador(cui)} style={{ padding: 8 }}>
                              <Ionicons name="trash-outline" size={20} color={TC.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.divider} />
                      </View>
                    ))
                  )}

                  {!showFormCuidador ? (
                    <TouchableOpacity onPress={() => setShowFormCuidador(true)} style={{ padding: 16, alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                      <Text style={{ color: TC.accent, fontWeight: '600' }}>+ Añadir Cuidador</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ padding: 16, backgroundColor: '#F8FAFC' }}>
                      <Text style={[styles.inputLabel, { marginBottom: 12, fontSize: 14 }]}>Nuevo Cuidador</Text>
                      <FloatingInput value={cuidadorNombre} onChangeText={setCuidadorNombre} placeholder="Nombre" />
                      <FloatingInput value={cuidadorApellido} onChangeText={setCuidadorApellido} placeholder="Apellidos" />
                      <FloatingInput value={cuidadorRol} onChangeText={setCuidadorRol} placeholder="Parentesco (Ej. Madre)" />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <FloatingInput value={cuidadorLada} onChangeText={setCuidadorLada} placeholder="Ej. +52" keyboardType="phone-pad" containerStyle={{ flex: 0.3 }} style={{ textAlign: 'center' }} />
                        <FloatingInput value={cuidadorNumero} onChangeText={setCuidadorNumero} placeholder="Número de Teléfono" keyboardType="phone-pad" containerStyle={{ flex: 1 }} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        <TouchableOpacity 
                          onPress={() => {
                            setShowFormCuidador(false);
                            setEditingCuidadorId(null);
                            setCuidadorNombre('');
                            setCuidadorApellido('');
                            setCuidadorNumero('');
                          }} 
                          style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: TC.inputBorder }}
                        >
                          <Text style={{ color: TC.textDark, fontWeight: 'bold' }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={agregarCuidador} style={{ flex: 1, backgroundColor: TC.textDark, padding: 12, borderRadius: 8, alignItems: 'center' }}>
                          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar</Text>
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
                  <Ionicons name="medical" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                  <Text style={styles.settingLabel}>Contactos de Emergencia</Text>
                </View>
                <Ionicons name={showEmergencias ? "chevron-down" : "chevron-forward"} size={18} color={TC.textMuted} />
              </TouchableOpacity>

              {showEmergencias && (
                <View>
                  {emergenciasList.length === 0 ? (
                    <View style={{ padding: 16, backgroundColor: '#F8FAFC' }}>
                      <Text style={{ color: TC.textMuted, fontSize: 13, textAlign: 'center' }}>Aún no hay contactos de emergencia.</Text>
                    </View>
                  ) : (
                    emergenciasList.map((em) => (
                      <View key={em.id}>
                        <View style={[styles.settingRow, { backgroundColor: '#F8FAFC' }]}>
                          <View style={styles.settingLeft}>
                            <Ionicons name="call" size={16} color={TC.textMuted} style={{ marginRight: 12, marginLeft: 16 }} />
                            <View>
                              <Text style={styles.settingLabel}>{em.nombreContacto}</Text>
                              <Text style={{ color: TC.textMuted, fontSize: 13 }}>{em.lada} {em.numero}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={() => editarEmergencia(em)} style={{ padding: 8 }}>
                              <Ionicons name="pencil" size={20} color={TC.textMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => eliminarEmergencia(em)} style={{ padding: 8 }}>
                              <Ionicons name="trash-outline" size={20} color={TC.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.divider} />
                      </View>
                    ))
                  )}

                  {!showFormEmergencia ? (
                    <TouchableOpacity onPress={() => setShowFormEmergencia(true)} style={{ padding: 16, alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                      <Text style={{ color: TC.accent, fontWeight: '600' }}>+ Añadir Emergencia</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ padding: 16, backgroundColor: '#F8FAFC' }}>
                      <Text style={[styles.inputLabel, { marginBottom: 12, fontSize: 14 }]}>Nuevo Contacto de Emergencia</Text>
                      <FloatingInput value={emergenciaNombre} onChangeText={setEmergenciaNombre} placeholder="Nombre del Contacto" />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <FloatingInput value={emergenciaLada} onChangeText={setEmergenciaLada} placeholder="Ej. +52" keyboardType="phone-pad" containerStyle={{ flex: 0.3 }} style={{ textAlign: 'center' }} />
                        <FloatingInput value={emergenciaNumero} onChangeText={setEmergenciaNumero} placeholder="Número de Teléfono" keyboardType="phone-pad" containerStyle={{ flex: 1 }} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        <TouchableOpacity 
                          onPress={() => {
                            setShowFormEmergencia(false);
                            setEditingEmergenciaId(null);
                            setEmergenciaNombre('');
                            setEmergenciaNumero('');
                          }} 
                          style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: TC.inputBorder }}
                        >
                          <Text style={{ color: TC.textDark, fontWeight: 'bold' }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={agregarEmergencia} style={{ flex: 1, backgroundColor: TC.textDark, padding: 12, borderRadius: 8, alignItems: 'center' }}>
                          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: TC.card,
    borderBottomWidth: 1,
    borderBottomColor: TC.inputBorder,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TC.textDark,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: TC.textDark,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TC.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: TC.card,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderCurve: "continuous" as any,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TC.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtnActive: {
    backgroundColor: TC.accentLight,
    borderWidth: 2,
    borderColor: TC.accent,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  cardGroup: {
    backgroundColor: TC.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    overflow: 'hidden',
    borderCurve: "continuous" as any,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TC.textDark,
    flex: 1,
  },
  textInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
    color: TC.textBody,
    fontWeight: '500',
  },
  textArea: {
    width: '100%',
    minHeight: 60,
    fontSize: 15,
    color: TC.textBody,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: TC.inputBorder,
    marginLeft: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: TC.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TC.inputBorder,
  },
  chipActive: {
    backgroundColor: TC.accentLight,
    borderColor: TC.accent,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TC.textMuted,
  },
  chipTextActive: {
    color: TC.accent,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TC.textDark,
  },
  contactInput: {
    textAlign: 'left',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TC.inputBorder
  },
});
