import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TC } from '../components/theme';
import { useToast } from '../components/Toast'; 
import { database } from '../src/database';
import { CitaPersonalizada, Perfil, AlertaMedica } from '../src/database/models';
import { useFocusEffect } from '@react-navigation/native';
import { Q } from '@nozbe/watermelondb';
import { scheduleReminder, cancelReminder } from '../src/services/notifications/NotificationService';
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const { showToast, ToastComponent } = useToast();
  
  // Data state
  const [reminders, setReminders] = useState<CitaPersonalizada[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [viewingMonth, setViewingMonth] = useState(new Date()); 

  const [editingCita, setEditingCita] = useState<CitaPersonalizada | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selectedPerfilId, setSelectedPerfilId] = useState('');
  const [avisoPrevio, setAvisoPrevio] = useState(false); 
  const [pickerVisible, setPickerVisible] = useState<'none' | 'date' | 'time'>('none');
  const [tempDate, setTempDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = viewingMonth.getFullYear();
    const month = viewingMonth.getMonth();
    const date = new Date(year, month, 1);
    const arr = [];
    while (date.getMonth() === month) {
      arr.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return arr;
  }, [viewingMonth]);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      const sub1 = database.collections.get<CitaPersonalizada>('citas_personalizadas')
        .query(Q.sortBy('fecha_cita', Q.asc)).observe().subscribe(setReminders);
      const sub2 = database.collections.get<Perfil>('perfiles')
        .query().observe().subscribe((data) => {
          setPerfiles(data);
          if (data.length > 0 && !selectedPerfilId) setSelectedPerfilId(data[0].id);
        });
      return () => { sub1.unsubscribe(); sub2.unsubscribe(); };
    }, [])
  );

  const filteredReminders = reminders.filter(r => 
    r.fechaCita.toDateString() === selectedDate.toDateString()
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedIds([id]);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    Alert.alert(
      'Eliminar', 
      `¿Borrar los ${selectedIds.length} elementos seleccionados?`, 
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar todo', style: 'destructive', onPress: async () => {
          try {
            const itemsToDelete = selectedIds
              .map(id => reminders.find(r => r.id === id))
              .filter(Boolean) as CitaPersonalizada[];

            await database.write(async () => {
              for (const item of itemsToDelete) {
                await item.markAsDeleted();
              }
            });

            // Llamadas a servicios externos fuera de la transacción
            for (const item of itemsToDelete) {
              await cancelReminder(item.id);
              await cancelReminder(item.id + '_pre');
            }

            showToast('success', 'Tareas eliminadas correctamente');
            exitSelectionMode();
          } catch (e) {
            console.error("[Reminders] Error al borrar:", e);
            showToast('error', 'Error al borrar las tareas seleccionadas');
          }
        }}
      ]
    );
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!titulo.trim() || !selectedPerfilId) {
      showToast('warning', 'Completa el título y selecciona un bebé');
      return;
    }
    // Permitir un margen de 1 minuto para evitar errores al guardar tareas para "ahora"
    if (tempDate.getTime() < Date.now() - 60000) {
      showToast('error', 'No puedes programar tareas en el pasado');
      return;
    }

    setIsSaving(true);
    try {
      const citasCol = database.collections.get<CitaPersonalizada>('citas_personalizadas');
      const alertasCol = database.collections.get<AlertaMedica>('alertas_medicas');
      let finalId = '';
      
      await database.write(async () => {
        if (editingCita) {
          await editingCita.update(c => {
            c.titulo = titulo.trim(); 
            c.notas = descripcion.trim(); 
            c.idPerfil = selectedPerfilId; 
            c.fechaCita = tempDate;
          });
          finalId = editingCita.id;
        } else {
          const newCita = await citasCol.create((cita) => {
            cita.idPerfil = selectedPerfilId; 
            cita.titulo = titulo.trim(); 
            cita.notas = descripcion.trim(); 
            cita.fechaCita = tempDate;
          });
          finalId = newCita.id;

          await alertasCol.create((alerta) => {
            alerta.idPerfil = selectedPerfilId;
            alerta.tipoAlerta = 'Agenda';
            alerta.nivel = 'Info';
            alerta.mensajeMedico = `${titulo.trim()}: ${descripcion.trim() || 'Recordatorio de agenda'}`;
            alerta.timestampEvento = tempDate.getTime();
            alerta.leida = false;
          });
        }
      });
      
      // La notificación principal reemplaza cualquier notificación previa si la hubiera
      await scheduleReminder(finalId, titulo.trim(), descripcion.trim() || `¡Es hora de: ${titulo.trim()}!`, tempDate);

      if (avisoPrevio) {
        const preDate = new Date(tempDate.getTime() - 10 * 60000);
        if (preDate.getTime() > Date.now()) {
          await scheduleReminder(finalId + '_pre', `Próximamente: ${titulo.trim()}`, `En 10 minutos: ${descripcion.trim() || titulo.trim()}`, preDate);
        } else {
          await cancelReminder(finalId + '_pre');
        }
      } else {
        await cancelReminder(finalId + '_pre');
      }

      setModalVisible(false);
      showToast('success', editingCita ? 'Tarea actualizada correctamente' : 'Tarea guardada con éxito');
    } catch (error) {
      console.error("[Reminders] Error al guardar:", error);
      showToast('error', 'Ocurrió un error al procesar tu solicitud');
    } finally {
      setIsSaving(false);
    }
  };

  const get12h = (date: Date) => {
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return { hours, ampm };
  };

  const changeMonth = (offset: number) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: offset * -15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      const newMonth = new Date(viewingMonth);
      newMonth.setMonth(newMonth.getMonth() + offset);
      setViewingMonth(newMonth);
      
      slideAnim.setValue(offset * 15);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  const openAddModal = () => {
    setEditingCita(null);
    setTitulo('');
    setDescripcion('');
    setAvisoPrevio(false);
    setTempDate(new Date());
    setModalVisible(true);
  };

  const openEditModal = (cita: CitaPersonalizada) => {
    setEditingCita(cita);
    setTitulo(cita.titulo);
    setDescripcion(cita.notas || '');
    setSelectedPerfilId(cita.idPerfil);
    setTempDate(cita.fechaCita);
    setAvisoPrevio(false);
    setModalVisible(true);
  };

  return (
    <View style={styles.root}>
      {ToastComponent}

      {isSelectionMode ? (
        <View style={[styles.selectionBar, { paddingTop: insets.top + 10 }]}>
           <TouchableOpacity onPress={exitSelectionMode} style={styles.barAction}>
             <Ionicons name="close" size={28} color="#FFF" />
           </TouchableOpacity>
           <Text style={styles.selectionCount}>{selectedIds.length} seleccionados</Text>
           <TouchableOpacity onPress={deleteSelected} style={styles.barAction}>
             <Ionicons name="trash" size={26} color="#FFF" />
           </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
              <Ionicons name="chevron-back" size={24} color={TC.textDark} />
            </TouchableOpacity>
            <View style={styles.topCenter}>
              <Text style={styles.headerLabel}>MI AGENDA</Text>
              <Text style={styles.headerTitle}>Recordatorios</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
          
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navArrow}><Ionicons name="chevron-back" size={22} color={TC.textDark} /></TouchableOpacity>
            <Animated.Text style={[styles.monthTitle, { transform: [{ translateX: slideAnim }], opacity: slideOpacity }]}>
              {MONTHS[viewingMonth.getMonth()]} {viewingMonth.getFullYear()}
            </Animated.Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navArrow}><Ionicons name="chevron-forward" size={22} color={TC.textDark} /></TouchableOpacity>
          </View>

          <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: slideOpacity }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
              {daysInMonth.map((d, i) => {
                const isSelected = d.toDateString() === selectedDate.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <TouchableOpacity key={i} onPress={() => setSelectedDate(d)} style={[styles.dayCard, isSelected && styles.dayCardActive, isToday && !isSelected && styles.dayCardToday]}>
                    <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>{d.toLocaleString('es-ES', { weekday: 'short' }).slice(0, 3).toUpperCase()}</Text>
                    <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      )}

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.timeline}>
          {filteredReminders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="calendar-clear" size={44} color={TC.accent} />
                </View>
                <Text style={styles.emptyTitle}>Día libre de tareas</Text>
                <Text style={styles.emptySubtitle}>No hay recordatorios programados para esta fecha. ¡Un buen momento para descansar!</Text>
              </View>

              <View style={styles.suggestionCard}>
                <View style={styles.suggestionIcon}>
                  <Ionicons name="bulb" size={20} color={TC.vitalTemp} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle}>Sugerencia</Text>
                  <Text style={styles.suggestionText}>Toca el botón + debajo para programar citas médicas, vacunas o tomas de medicamentos.</Text>
                </View>
              </View>
            </View>
          ) : (
            filteredReminders.map((item) => {
              const perfil = perfiles.find(p => p.id === item.idPerfil);
              const { hours, ampm } = get12h(item.fechaCita);
              const mins = item.fechaCita.getMinutes().toString().padStart(2, '0');
              const isSelected = selectedIds.includes(item.id);
              
              return (
                <View key={item.id} style={styles.cardContainer}>
                  <Text style={styles.cardTime}>{hours}:{mins} {ampm}</Text>
                  <TouchableOpacity 
                    style={[styles.card, isSelected && styles.cardSelected]} 
                    onPress={() => isSelectionMode ? toggleSelection(item.id) : openEditModal(item)}
                    onLongPress={() => handleLongPress(item.id)}
                    activeOpacity={0.7}
                  >
                    {isSelectionMode && (
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                    )}
                    <View style={styles.avatar}><Text>{perfil?.avatar || '👶'}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.titulo}</Text>
                      {item.notas ? <Text style={styles.cardDesc} numberOfLines={1}>{item.notas}</Text> : null}
                    </View>
                    {!isSelectionMode && (
                      <Ionicons name="ellipsis-vertical" size={18} color={TC.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {!isSelectionMode && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.8}>
          <View style={styles.fabG}>
            <Ionicons name="add" size={32} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { paddingTop: 40 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalLabel}>{editingCita ? 'Editar Tarea' : 'Nueva Tarea'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={34} color={TC.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>Título</Text>
            <TextInput style={styles.input} placeholder="¿Qué recordar?" placeholderTextColor={TC.textMuted} value={titulo} onChangeText={setTitulo} />
            
            <Text style={styles.label}>Descripción</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Detalles extra..." placeholderTextColor={TC.textMuted} value={descripcion} onChangeText={setDescripcion} multiline />

            <Text style={styles.label}>Aviso Anticipado</Text>
            <TouchableOpacity 
                style={[styles.preAlertToggle, avisoPrevio && styles.preAlertActive]} 
                onPress={() => setAvisoPrevio(!avisoPrevio)}
            >
                <Ionicons name={avisoPrevio ? "notifications-circle" : "notifications-off-outline"} size={22} color={avisoPrevio ? "#FFF" : TC.textMuted} />
                <Text style={[styles.preAlertText, avisoPrevio && {color: '#FFF'}]}>Avisarme 10 min antes</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Bebé</Text>
            <View style={styles.row}>
               {perfiles.map(p => (
                 <TouchableOpacity key={p.id} style={[styles.chip, selectedPerfilId === p.id && styles.chipActive]} onPress={() => setSelectedPerfilId(p.id)}>
                   <Text style={[styles.chipText, selectedPerfilId === p.id && {color:'#FFF'}]}>{p.avatar} {p.nombreIdentificador}</Text>
                 </TouchableOpacity>
               ))}
            </View>

            <View style={styles.pickerRow}>
              <View style={{ flex: 1.2 }}><Text style={styles.label}>Día</Text>
                <TouchableOpacity style={styles.pTrigger} onPress={() => setPickerVisible('date')}>
                  <Text style={styles.pTriggerText}>{tempDate.toLocaleDateString()}</Text>
                  <Ionicons name="calendar" size={18} color={TC.accent} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}><Text style={styles.label}>Hora</Text>
                <TouchableOpacity style={styles.pTrigger} onPress={() => setPickerVisible('time')}>
                  <Text style={styles.pTriggerText}>{get12h(tempDate).hours}:{tempDate.getMinutes().toString().padStart(2,'0')} {get12h(tempDate).ampm}</Text>
                  <Ionicons name="time" size={18} color={TC.accent} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.save} onPress={handleSave} disabled={isSaving} activeOpacity={0.8}>
               <View style={styles.saveG}>
                 {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{editingCita ? 'Actualizar' : 'Guardar'}</Text>}
               </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Modal visible={pickerVisible !== 'none'} transparent animationType="fade">
          <View style={styles.pOverlay}>
            <View style={styles.pCard}>
              <Text style={styles.pTitle}>{pickerVisible === 'date' ? 'Fecha' : 'Hora'}</Text>
              <View style={{ height: 250, flexDirection: 'row' }}>
                {pickerVisible === 'date' ? (
                  <>
                    <FlatList data={[...Array(31).keys()]} renderItem={({item}) => {
                      const day = item + 1;
                      return (
                        <TouchableOpacity style={[styles.pickerItem, tempDate.getDate() === day && { backgroundColor: TC.accentLight }]} onPress={() => {
                          const d = new Date(tempDate); d.setDate(day); setTempDate(d);
                        }}>
                          <Text style={[styles.pickerItemText, tempDate.getDate() === day && { color: TC.accent, fontWeight: '800' }]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    }}/>
                    <FlatList data={MONTHS} renderItem={({item, index}) => {
                      const isSelected = tempDate.getMonth() === index;
                      return (
                        <TouchableOpacity style={[styles.pickerItem, isSelected && { backgroundColor: TC.accentLight }]} onPress={() => {
                          const d = new Date(tempDate); d.setMonth(index); setTempDate(d);
                        }}>
                          <Text style={[styles.pickerItemText, isSelected && { color: TC.accent, fontWeight: '800' }]}>{item.slice(0,3)}</Text>
                        </TouchableOpacity>
                      );
                    }}/>
                    <FlatList data={[2026, 2027, 2028, 2029, 2030]} renderItem={({item}) => {
                      const isSelected = tempDate.getFullYear() === item;
                      return (
                        <TouchableOpacity style={[styles.pickerItem, isSelected && { backgroundColor: TC.accentLight }]} onPress={() => {
                          const d = new Date(tempDate); d.setFullYear(item); setTempDate(d);
                        }}>
                          <Text style={[styles.pickerItemText, isSelected && { color: TC.accent, fontWeight: '800' }]}>{item}</Text>
                        </TouchableOpacity>
                      );
                    }}/>
                  </>
                ) : (
                  <>
                    <FlatList data={[...Array(12).keys()]} renderItem={({item}) => {
                      const h12 = item + 1;
                      const { hours: currH12 } = get12h(tempDate);
                      return (
                        <TouchableOpacity style={[styles.pickerItem, currH12 === h12 && { backgroundColor: TC.accentLight }]} onPress={() => {
                          const d = new Date(tempDate); 
                          let h24 = h12;
                          const { ampm } = get12h(tempDate);
                          if (ampm === 'PM' && h24 < 12) h24 += 12;
                          if (ampm === 'AM' && h24 === 12) h24 = 0;
                          d.setHours(h24); setTempDate(d);
                        }}>
                          <Text style={[styles.pickerItemText, currH12 === h12 && { color: TC.accent, fontWeight: '800' }]}>{h12}</Text>
                        </TouchableOpacity>
                      );
                    }}/>
                    <FlatList data={[...Array(60).keys()]} renderItem={({item}) => {
                      const isSelected = tempDate.getMinutes() === item;
                      return (
                        <TouchableOpacity style={[styles.pickerItem, isSelected && { backgroundColor: TC.accentLight }]} onPress={() => {
                          const d = new Date(tempDate); d.setMinutes(item); setTempDate(d);
                        }}>
                          <Text style={[styles.pickerItemText, isSelected && { color: TC.accent, fontWeight: '800' }]}>{item.toString().padStart(2,'0')}</Text>
                        </TouchableOpacity>
                      );
                    }}/>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <TouchableOpacity style={[styles.pickerItem, get12h(tempDate).ampm === 'AM' && { backgroundColor: TC.accentLight }]} onPress={() => {
                        const d = new Date(tempDate); if (d.getHours() >= 12) d.setHours(d.getHours() - 12); setTempDate(d);
                      }}>
                        <Text style={[styles.pickerItemText, get12h(tempDate).ampm === 'AM' && { color: TC.accent, fontWeight: '800' }]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.pickerItem, get12h(tempDate).ampm === 'PM' && { backgroundColor: TC.accentLight }]} onPress={() => {
                        const d = new Date(tempDate); if (d.getHours() < 12) d.setHours(d.getHours() + 12); setTempDate(d);
                      }}>
                        <Text style={[styles.pickerItemText, get12h(tempDate).ampm === 'PM' && { color: TC.accent, fontWeight: '800' }]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
              <TouchableOpacity style={styles.pOk} onPress={() => setPickerVisible('none')}><Text style={styles.pOkText}>LISTO</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },
  
  // Header & Selection Bar
  header: { paddingBottom: 20 },
  selectionBar: { backgroundColor: TC.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, borderCurve: 'continuous' as any },
  selectionCount: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  barAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  topRow: { flexDirection: 'row', paddingHorizontal: 20, alignItems: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  backCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: TC.card, alignItems: 'center', justifyContent: 'center', shadowColor: TC.textDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: TC.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' as any, marginBottom: 4 },
  headerTitle: { color: TC.textDark, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 18 },
  monthTitle: { fontSize: 20, fontWeight: '800', color: TC.textDark, textTransform: 'capitalize' as any },
  navArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: TC.card, alignItems: 'center', justifyContent: 'center', shadowColor: TC.textDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  
  daysScroll: { paddingHorizontal: 20, gap: 10, marginTop: 20, paddingBottom: 8 },
  dayCard: { width: 58, height: 80, borderRadius: 22, backgroundColor: TC.card, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' as any, borderWidth: 1, borderColor: TC.inputBorder, shadowColor: TC.textDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  dayCardActive: { backgroundColor: TC.accent, borderColor: TC.accent, shadowColor: TC.accent, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  dayCardToday: { borderColor: TC.accent, borderWidth: 1.5 },
  dayNum: { color: TC.textDark, fontSize: 20, fontWeight: '800' },
  dayName: { color: TC.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  dayNumActive: { color: '#FFF' },
  dayNameActive: { color: 'rgba(255,255,255,0.85)' },

  body: { flex: 1, backgroundColor: TC.bg, marginTop: 4 },
  timeline: { padding: 24, paddingBottom: 100 },
  cardContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTime: { width: 72, fontSize: 13, fontWeight: '800', color: TC.textMuted, letterSpacing: -0.2 },
  card: { flex: 1, backgroundColor: TC.card, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderCurve: 'continuous' as any, borderWidth: 1, borderColor: TC.inputBorder, shadowColor: TC.textDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 },
  cardSelected: { borderColor: TC.accent, backgroundColor: TC.accentLight, borderWidth: 2 },
  
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: TC.textMuted, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: TC.accent, borderColor: TC.accent },

  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: TC.trackBg, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: TC.textDark, letterSpacing: -0.2 },
  cardDesc: { fontSize: 13, color: TC.textBody, marginTop: 4, fontWeight: '500' },

  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, shadowColor: TC.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  fabG: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: TC.accent },

  modal: { flex: 1, backgroundColor: TC.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, alignItems: 'center', marginBottom: 10 },
  modalLabel: { fontSize: 24, fontWeight: '800', color: TC.textDark, letterSpacing: -0.5 },
  form: { padding: 25 },
  input: { backgroundColor: TC.card, borderRadius: 20, padding: 18, fontSize: 15, color: TC.textDark, fontWeight: '600', borderWidth: 1, borderColor: TC.inputBorder, borderCurve: 'continuous' as any },
  label: { fontSize: 11, fontWeight: '700', marginTop: 24, marginBottom: 10, color: TC.textMuted, textTransform: 'uppercase' as any, letterSpacing: 1.2 },
  
  preAlertToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: TC.card, padding: 18, borderRadius: 20, gap: 12, borderWidth: 1, borderColor: TC.inputBorder, borderCurve: 'continuous' as any },
  preAlertActive: { backgroundColor: TC.accent, borderColor: TC.accent },
  preAlertText: { fontSize: 15, fontWeight: '700', color: TC.textDark },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, backgroundColor: TC.card, borderWidth: 1, borderColor: TC.inputBorder, borderCurve: 'continuous' as any },
  chipText: { fontWeight: '700', color: TC.textBody, fontSize: 14 },
  chipActive: { backgroundColor: TC.accent, borderColor: TC.accent },
  
  pickerRow: { flexDirection: 'row', gap: 16 },
  pTrigger: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: TC.card, padding: 18, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: TC.inputBorder, borderCurve: 'continuous' as any },
  pTriggerText: { fontSize: 14, color: TC.textDark, fontWeight: '700' },
  
  save: { marginTop: 40, height: 60, borderRadius: 24, overflow: 'hidden', shadowColor: TC.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4, borderCurve: 'continuous' as any },
  saveG: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: TC.accent },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  pOverlay: { flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.5)', justifyContent: 'center', padding: 24 },
  pCard: { backgroundColor: TC.card, borderRadius: 32, padding: 24, borderCurve: 'continuous' as any, shadowColor: TC.textDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  pTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20, color: TC.textDark },
  pickerItem: { paddingVertical: 12, alignItems: 'center', borderRadius: 12, flex: 1, borderCurve: 'continuous' as any },
  pickerItemText: { fontSize: 16, color: TC.textBody },
  pOk: { backgroundColor: TC.accent, padding: 16, borderRadius: 20, marginTop: 20, alignItems: 'center', borderCurve: 'continuous' as any },
  pOkText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  emptyContainer: { paddingHorizontal: 4, marginTop: 20, gap: 16 },
  emptyCard: { backgroundColor: TC.card, borderRadius: 32, padding: 32, alignItems: 'center', borderCurve: 'continuous' as any, borderWidth: 1, borderColor: TC.inputBorder, shadowColor: TC.textDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: TC.accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: TC.textDark, marginBottom: 8, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 15, color: TC.textBody, fontWeight: '500', textAlign: 'center', lineHeight: 22 },
  
  suggestionCard: { flexDirection: 'row', backgroundColor: TC.vitalTemp + '10', borderRadius: 24, padding: 20, alignItems: 'center', gap: 16, borderCurve: 'continuous' as any, borderWidth: 1, borderColor: TC.vitalTemp + '20' },
  suggestionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: TC.card, alignItems: 'center', justifyContent: 'center', shadowColor: TC.textDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  suggestionTitle: { fontSize: 14, fontWeight: '800', color: TC.textDark, marginBottom: 4 },
  suggestionText: { fontSize: 13, color: TC.textBody, fontWeight: '500', lineHeight: 18 }
});
