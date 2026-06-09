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
import WaveHeader from '@/components/WaveHeader';
import GradientButton from '@/components/GradientButton';
import { database } from '@/src/database';
import { Perfil, Dispositivo } from '@/src/database/models';
import { adapter } from '@/src/services/ble/bleService';
import { useToast } from '@/components/Toast';

interface ScannedDevice {
  id: string;
  name: string | null;
}

export default function SensorManagement() {
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
      <WaveHeader height={200} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Gestión de Sensores</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISPOSITIVOS VINCULADOS</Text>
          {pairedDevices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bluetooth-outline" size={48} color={TC.textMuted} />
              <Text style={styles.emptyText}>No hay sensores vinculados aún.</Text>
            </View>
          ) : (
            pairedDevices.map(dev => {
              const baby = babies.find(b => b.id === dev.idPerfil);
              const sensors = dev.sensoresConfig;
              return (
                <View key={dev.id} style={styles.deviceCard}>
                  <View style={styles.deviceHeader}>
                    <View style={styles.deviceIconBox}>
                      <Ionicons name="hardware-chip" size={24} color={TC.accent} />
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{dev.nombre}</Text>
                      <Text style={styles.deviceSub}>
                        Asignado a: <Text style={{fontWeight: '700'}}>{baby?.nombreIdentificador || 'Bebé'}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteDevice(dev.id)}>
                      <Ionicons name="trash-outline" size={20} color={TC.vitalHeart} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.sensorGrid}>
                    {sensors.map((s: any) => (
                      <View key={s.tipo} style={styles.sensorBadge}>
                        <View style={[styles.statusDot, { backgroundColor: s.estado === 'ok' ? '#4ADE80' : '#F87171' }]} />
                        <Text style={styles.sensorName}>{s.tipo}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.deviceFooter}>
                    <Text style={styles.statusText}>Estado: {dev.estado.toUpperCase()}</Text>
                    <Text style={styles.lastSeen}>Última vez: {new Date(dev.ultimaConexion).toLocaleTimeString()}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.scanHeader}>
            <Text style={styles.sectionTitle}>BUSCAR NUEVOS SENSORES</Text>
            {scanning && <ActivityIndicator size="small" color={TC.accent} />}
          </View>
          
          {!scanning ? (
            <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
              <Ionicons name="search" size={20} color={TC.accent} />
              <Text style={styles.scanBtnText}>INICIAR ESCANEO</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.scanBtn, {borderColor: TC.vitalHeart}]} onPress={stopScan}>
              <Ionicons name="stop" size={20} color={TC.vitalHeart} />
              <Text style={[styles.scanBtnText, {color: TC.vitalHeart}]}>DETENER ESCANEO</Text>
            </TouchableOpacity>
          )}

          {devices.map(dev => (
            <TouchableOpacity key={dev.id} style={styles.scannedDevice} onPress={() => handlePair(dev)}>
              <Ionicons name="bluetooth" size={24} color={TC.accent} />
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={styles.scannedName}>{dev.name || 'Dispositivo Desconocido'}</Text>
                <Text style={styles.scannedId}>{dev.id}</Text>
              </View>
              <Ionicons name="add-circle" size={28} color={TC.accent} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal de Vinculación */}
      <Modal visible={showPairModal} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Vincular Dispositivo</Text>
            <Text style={styles.modalSub}>
              ¿A qué bebé quieres asignar el monitor <Text style={{fontWeight: '700'}}>{deviceToPair?.name || 'TinyCare'}</Text>?
            </Text>
            
            <View style={styles.babyList}>
              {babies.map(b => (
                <TouchableOpacity 
                  key={b.id} 
                  style={[styles.babyItem, selectedBaby?.id === b.id && styles.babyItemSelected]}
                  onPress={() => setSelectedBaby(b)}
                >
                  <Text style={styles.babyEmoji}>{b.avatar || '👶'}</Text>
                  <Text style={[styles.babyName, selectedBaby?.id === b.id && {color: '#FFF'}]}>
                    {b.nombreIdentificador}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPairModal(false)}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmPairing}>
                <Text style={styles.confirmBtnText}>VINCULAR</Text>
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
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginLeft: 12,
  },
  scroll: {
    paddingTop: 180,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TC.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  deviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 16,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '800',
    color: TC.textDark,
  },
  deviceSub: {
    fontSize: 14,
    color: TC.textBody,
    marginTop: 2,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sensorName: {
    fontSize: 12,
    fontWeight: '700',
    color: TC.textDark,
  },
  deviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4ADE80',
  },
  lastSeen: {
    fontSize: 11,
    color: TC.textMuted,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: TC.accent,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: TC.accent,
  },
  scannedDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  scannedName: {
    fontSize: 16,
    fontWeight: '700',
    color: TC.textDark,
  },
  scannedId: {
    fontSize: 12,
    color: TC.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 12,
    color: TC.textMuted,
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TC.textDark,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 16,
    color: TC.textBody,
    textAlign: 'center',
    marginBottom: 24,
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
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  babyItemSelected: {
    backgroundColor: TC.accent,
    borderColor: TC.accent,
  },
  babyEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  babyName: {
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
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontWeight: '700',
    color: TC.textBody,
  },
  confirmBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: TC.accent,
  },
  confirmBtnText: {
    fontWeight: '700',
    color: '#FFF',
  },
});
