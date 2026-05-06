import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../src/database';
import { Perfil } from '../src/database/models';
import { TC } from '../components/theme';

export default function BabySelectorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [babies, setBabies] = useState<Perfil[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBabies = async () => {
      const perfiles = await database.collections.get<Perfil>('perfiles').query().fetch();
      setBabies(perfiles);
      const storedActive = await AsyncStorage.getItem('@active_baby_id');
      if (storedActive) {
        setActiveId(storedActive);
      } else if (perfiles.length > 0) {
        setActiveId(perfiles[0].id);
      }
    };
    fetchBabies();
  }, []);

  const handleSelect = async (id: string) => {
    await AsyncStorage.setItem('@active_baby_id', id);
    setActiveId(id);
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={28} color={TC.textDark} onPress={() => router.back()} />
        <Text style={styles.title}>Seleccionar Perfil Activo</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {babies.map((baby) => {
          const isActive = baby.id === activeId;
          return (
            <TouchableOpacity
              key={baby.id}
              style={[styles.card, isActive && styles.cardActive]}
              activeOpacity={0.8}
              onPress={() => handleSelect(baby.id)}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.emojiBox, isActive && styles.emojiBoxActive]}>
                  <Text style={styles.emoji}>{baby.avatar || '👶🏻'}</Text>
                </View>
                <View>
                  <Text style={[styles.name, isActive && styles.nameActive]}>
                    {baby.nombreIdentificador || 'Bebé'}
                  </Text>
                  {isActive && <Text style={styles.activeLabel}>Activo actualmente</Text>}
                </View>
              </View>
              {isActive && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          );
        })}
        {babies.length === 0 && (
          <Text style={styles.emptyText}>No hay perfiles registrados.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TC.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: TC.bg,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 20, fontWeight: '700', color: TC.textDark, marginLeft: 16 },
  scrollContent: { padding: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TC.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emojiBoxActive: {
    backgroundColor: '#D1FAE5',
  },
  emoji: { fontSize: 24 },
  name: { fontSize: 18, fontWeight: '600', color: TC.textDark },
  nameActive: { color: '#065F46' },
  activeLabel: { fontSize: 14, color: '#10B981', marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 40, color: TC.textMuted, fontSize: 16 },
});
