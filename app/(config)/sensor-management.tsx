import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TC } from '@/components/theme';
import { database } from '@/src/database';
import { Perfil, Dispositivo } from '@/src/database/models';
import { adapter } from '@/src/services/ble/bleService';
import { useToast } from '@/components/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScannedDevice {
  id: string;
  name: string | null;
}

export default function SensorManagement() {
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [babies, setBabies] = useState<Perfil[]>([]);
  const [selectedBaby, setSelectedBaby] = useState<Perfil | null>(null);
  const [pairedDevices, setPairedDevices] = useState<Dispositivo[]>([]);
  
  const [showPairModal, setShowPairModal] = useState(false);
  const [deviceToPair, setDeviceToPair] = useState<ScannedDevice | null>(null);
  
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadData();
    return () => {
      stopScan();
    };
  }, []);

  const loadData = async () => {
    const perfiles = await database.get<Perfil>('perfiles').query().fetch();
    setBabies(perfiles);
    
    const dispositivos = await database.get<Dispositivo>('dispositivos').query().fetch();
    setPairedDevices(dispositivos);
    
    if (perfiles.length > 0) {
      setSelectedBaby(perfiles[0]);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Number(Platform.Version) >= 31) {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          return (
            result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
            result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          return (
            result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED ||
            result['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
          );
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const startScan = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      showToast('error', 'Se requieren permisos de Bluetooth para escanear');
      return;
    }

    setDevices([]);
    setScanning(true);

    // Simulador Web — solo en plataforma web donde BLE no está disponible
    if (Platform.OS === 'web') {
      setTimeout(() => {
        setDevices(prev => {
          if (prev.find(d => d.id === 'SIM-ESP32-8A9C')) return prev;
          return [...prev, { id: 'SIM-ESP32-8A9C', name: 'Simulador ESP32-TinyCare' }];
        });
      }, 1500);
      
      setTimeout(() => {
        setDevices(prev => {
          if (prev.find(d => d.id === 'SIM-BLUE-11B2')) return prev;
          return [...prev, { id: 'SIM-BLUE-11B2', name: 'Bluefruit SmartBaby' }];
        });
      }, 3500);
    }

    adapter.startScanning((device) => {
      setDevices(prev => {
        if (prev.find(d => d.id === device.id)) return prev;
        return [...prev, { id: device.id, name: device.name }];
      });
    });

    // Detener escaneo después de 10 segundos
    setTimeout(() => {
      stopScan();
    }, 10000);
  };

  const stopScan = () => {
    adapter.stopScanning();
    setScanning(false);
  };

  const handlePair = async (device: ScannedDevice) => {
    setDeviceToPair(device);
    setShowPairModal(true);
  };

  const confirmPairing = async () => {
    if (!deviceToPair || !selectedBaby) return;

    try {
      await database.write(async () => {
        await database.get<Dispositivo>('dispositivos').create(d => {
          d.idPerfil = selectedBaby.id;
          d.identificadorHardware = deviceToPair.id;
          d.nombre = deviceToPair.name || 'Monitor TinyCare';
          d.tipoControlador = deviceToPair.name?.includes('ESP32') ? 'ESP32' : 'Bluefruit';
          d.estado = 'activo';
          d.sensoresConfigJson = JSON.stringify([
            { tipo: 'FC', estado: 'ok', nombre: 'Frecuencia Cardíaca' },
            { tipo: 'SpO2', estado: 'ok', nombre: 'Oxigenación' },
            { tipo: 'TEMP', estado: 'ok', nombre: 'Temperatura' },
            { tipo: 'MOV', estado: 'ok', nombre: 'Acelerómetro' },
          ]);
          d.ultimaConexion = Date.now();
        });
      });

      setShowPairModal(false);
      setDeviceToPair(null);
      showToast('success', 'Sensor vinculado exitosamente');
      loadData();
    } catch (error) {
      console.error('Error al vincular dispositivo:', error);
      showToast('error', 'Ocurrió un error al vincular el sensor');
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      await database.write(async () => {
        const device = await database.get<Dispositivo>('dispositivos').find(id);
        await device.destroyPermanently();
      });
      showToast('success', 'Sensor eliminado');
      loadData();
    } catch (error) {
      console.error('Error al eliminar dispositivo:', error);
      showToast('error', 'Ocurrió un error al intentar eliminar el sensor');
    }
  };

  return (
    <View style={styles.root}>
      {ToastComponent}

      {/* ── Header — flat, no WaveHeader, matches home.tsx ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
            <Ionicons name="chevron-back" size={24} color={TC.textDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>CONFIGURACIÓN</Text>
          <Text style={styles.headerTitle}>Gestión de Sensores</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Paired Devices Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBadge, { backgroundColor: TC.accent + '15' }]}>
              <Ionicons name="hardware-chip" size={16} color={TC.accent} />
            </View>
            <Text style={styles.sectionTitle}>Dispositivos Vinculados</Text>
          </View>

          {pairedDevices.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconBox, { backgroundColor: TC.accent + '10' }]}>
                <Ionicons name="bluetooth-outline" size={36} color={TC.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Sin sensores vinculados</Text>
              <Text style={styles.emptySubtitle}>Escanea y vincula un monitor para comenzar</Text>
            </View>
          ) : (
            pairedDevices.map(dev => {
              const baby = babies.find(b => b.id === dev.idPerfil);
              const sensors = dev.sensoresConfig;
              return (
                <View key={dev.id} style={styles.deviceCard}>
                  <View style={styles.deviceHeader}>
                    <View style={styles.deviceIconBox}>
                      <Ionicons name="hardware-chip" size={22} color={TC.accent} />
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{dev.nombre}</Text>
                      <Text style={styles.deviceSub}>
                        Asignado a: <Text style={{ fontWeight: '700' }}>{baby?.nombreIdentificador || 'Bebé'}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteDevice(dev.id)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={TC.vitalHeart} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.divider} />

                  <View style={styles.sensorGrid}>
                    {sensors.map((s: any) => (
                      <View key={s.tipo} style={styles.sensorBadge}>
                        <View style={[styles.statusDot, { backgroundColor: s.estado === 'ok' ? '#4ADE80' : TC.vitalHeart }]} />
                        <Text style={styles.sensorName}>{s.tipo}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.deviceFooter}>
                    <View style={styles.statusPill}>
                      <View style={[styles.statusDotSmall, { backgroundColor: '#4ADE80' }]} />
                      <Text style={styles.statusText}>{dev.estado.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.lastSeen}>Última vez: {new Date(dev.ultimaConexion).toLocaleTimeString()}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Scan Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBadge, { backgroundColor: TC.vitalOxygen + '15' }]}>
              <Ionicons name="search" size={16} color={TC.vitalOxygen} />
            </View>
            <Text style={styles.sectionTitle}>Buscar Nuevos Sensores</Text>
            {scanning && <ActivityIndicator size="small" color={TC.accent} style={{ marginLeft: 8 }} />}
          </View>
          
          {!scanning ? (
            <TouchableOpacity style={styles.scanBtn} onPress={startScan} activeOpacity={0.8}>
              <View style={styles.scanBtnIconBox}>
                <Ionicons name="bluetooth" size={20} color={TC.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanBtnTitle}>Iniciar Escaneo</Text>
                <Text style={styles.scanBtnSub}>Buscar dispositivos BLE cercanos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TC.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.scanBtnActive} onPress={stopScan} activeOpacity={0.8}>
              <View style={[styles.scanBtnIconBox, { backgroundColor: TC.vitalHeart + '15' }]}>
                <Ionicons name="stop" size={20} color={TC.vitalHeart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.scanBtnTitle, { color: TC.vitalHeart }]}>Detener Escaneo</Text>
                <Text style={styles.scanBtnSub}>Buscando dispositivos...</Text>
              </View>
              <ActivityIndicator size="small" color={TC.vitalHeart} />
            </TouchableOpacity>
          )}

          {devices.map(dev => (
            <TouchableOpacity key={dev.id} style={styles.scannedDevice} onPress={() => handlePair(dev)} activeOpacity={0.7}>
              <View style={[styles.scanBtnIconBox, { backgroundColor: TC.accent + '12' }]}>
                <Ionicons name="bluetooth" size={20} color={TC.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.scannedName}>{dev.name || 'Dispositivo Desconocido'}</Text>
                <Text style={styles.scannedId}>{dev.id}</Text>
              </View>
              <View style={styles.addPill}>
                <Ionicons name="add" size={16} color={TC.accent} />
                <Text style={styles.addPillText}>Vincular</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Pairing Modal ── */}
      <Modal visible={showPairModal} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Vincular Dispositivo</Text>
            <Text style={styles.modalSub}>
              ¿A qué bebé quieres asignar el monitor <Text style={{ fontWeight: '800' }}>{deviceToPair?.name || 'TinyCare'}</Text>?
            </Text>
            
            <View style={styles.babyList}>
              {babies.map(b => (
                <TouchableOpacity 
                  key={b.id} 
                  style={[styles.babyItem, selectedBaby?.id === b.id && styles.babyItemSelected]}
                  onPress={() => setSelectedBaby(b)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.babyEmoji}>{b.avatar || '👶'}</Text>
                  <Text style={[styles.babyNameText, selectedBaby?.id === b.id && { color: '#FFF' }]}>
                    {b.nombreIdentificador}
                  </Text>
                  {selectedBaby?.id === b.id && (
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPairModal(false)} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmPairing} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>Vincular</Text>
              </TouchableOpacity>
            </View>
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

  /* ── Header — flat, clean, mirrors home.tsx ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
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

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },

  /* ── Sections ── */
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
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
    fontSize: 17,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.3,
  },

  /* ── Device Card — mirrors home.tsx card pattern ── */
  deviceCard: {
    backgroundColor: TC.card,
    borderRadius: 32,
    padding: 24,
    marginBottom: 16,
    borderCurve: 'continuous' as any,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: TC.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous' as any,
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 16,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.3,
  },
  deviceSub: {
    fontSize: 14,
    color: TC.textBody,
    marginTop: 2,
    fontWeight: '500',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TC.vitalHeart + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: TC.inputBorder,
    marginVertical: 20,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TC.inputBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderCurve: 'continuous' as any,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sensorName: {
    fontSize: 13,
    fontWeight: '700',
    color: TC.textDark,
  },
  deviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ADE80' + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  lastSeen: {
    fontSize: 11,
    color: TC.textMuted,
    fontWeight: '600',
  },

  /* ── Scan Button — banner style like home BLE banners ── */
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TC.accentLight,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TC.accent + '30',
    borderCurve: 'continuous' as any,
  },
  scanBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TC.vitalHeart + '08',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TC.vitalHeart + '20',
    borderCurve: 'continuous' as any,
  },
  scanBtnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: TC.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderCurve: 'continuous' as any,
  },
  scanBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TC.accent,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  scanBtnSub: {
    fontSize: 13,
    color: TC.textBody,
    fontWeight: '500',
  },

  /* ── Scanned devices ── */
  scannedDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TC.card,
    padding: 18,
    borderRadius: 24,
    marginBottom: 12,
    borderCurve: 'continuous' as any,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  scannedName: {
    fontSize: 16,
    fontWeight: '700',
    color: TC.textDark,
  },
  scannedId: {
    fontSize: 12,
    color: TC.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TC.accent + '12',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  addPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: TC.accent,
  },

  /* ── Empty state ── */
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: TC.card,
    borderRadius: 32,
    borderCurve: 'continuous' as any,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderCurve: 'continuous' as any,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TC.textDark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: TC.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },

  /* ── Modal — uses TC tokens consistently ── */
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: TC.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 48,
    alignItems: 'center',
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: TC.inputBorder,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TC.textDark,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 15,
    color: TC.textBody,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '500',
  },
  babyList: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  babyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: TC.inputBg,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderCurve: 'continuous' as any,
  },
  babyItemSelected: {
    backgroundColor: TC.accent,
    borderColor: TC.accent,
  },
  babyEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  babyNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: TC.textDark,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: TC.trackBg,
    borderCurve: 'continuous' as any,
  },
  cancelBtnText: {
    fontWeight: '700',
    color: TC.textBody,
    fontSize: 15,
  },
  confirmBtn: {
    flex: 2,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: TC.accent,
    borderCurve: 'continuous' as any,
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmBtnText: {
    fontWeight: '800',
    color: '#FFF',
    fontSize: 15,
  },
});
