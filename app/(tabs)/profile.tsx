import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TC } from "../../components/theme";
import { database } from "../../src/database";
import { Perfil } from "../../src/database/models";
import { useFocusEffect } from "@react-navigation/native";

export default function ProfileScreen() {
  const [babies, setBabies] = useState<{ id: string, name: string, emoji: string }[]>([]);

  // Recargar cada vez que la pantalla gana foco (ej. al regresar de edit-baby)
  useFocusEffect(
    useCallback(() => {
      const perfilesCollection = database.collections.get<Perfil>('perfiles');
      const subscription = perfilesCollection.query().observe().subscribe((perfiles) => {
        setBabies(perfiles.map(p => ({
          id: p.id,
          name: p.nombreIdentificador || 'Bebé',
          emoji: p.avatar || '👶🏻',
        })));
      });
      return () => subscription.unsubscribe();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas salir de tu cuenta en la nube? Tus datos locales se mantendrán seguros.");
  };

  const handleAddBaby = () => {
    // Redirigir al onboarding para agregar nuevo
    router.push("/onboarding");
  };

  const SettingRow = ({ icon, label, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIconBox, isDestructive && { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name={icon} size={20} color={isDestructive ? '#EF4444' : TC.accent} />
        </View>
        <Text style={[styles.settingLabel, isDestructive && { color: '#EF4444' }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color={TC.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Configuración</Text>
        </View>

        {/* ── Cloud Account Section ── */}
        <View style={styles.cloudCard}>
          <View style={styles.cloudLeft}>
            <View style={styles.cloudAvatar}>
              <Ionicons name="cloud-offline" size={28} color={TC.textMuted} />
            </View>
            <View style={styles.cloudTextContainer}>
              <Text style={styles.cloudTitle}>Modo Local Activo</Text>
              <Text style={styles.cloudSub}>Los datos solo existen en tu dispositivo.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cloudBtn} activeOpacity={0.8}>
            <Text style={styles.cloudBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* ── My Babies Section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis Bebés</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.babiesScroll}>
            {babies.map((b) => (
              <TouchableOpacity 
                key={b.id} 
                style={styles.babyCard} 
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/edit-baby', params: { id: b.id } })}
              >
                <View style={styles.babyEmojiBox}>
                  <Text style={styles.babyEmoji}>{b.emoji}</Text>
                </View>
                <Text style={styles.babyName}>{b.name}</Text>
                <Text style={styles.babyEdit}>Editar Perfil</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.babyAddCard} activeOpacity={0.8} onPress={handleAddBaby}>
              <View style={styles.babyAddIconBox}>
                <Ionicons name="add" size={32} color={TC.accent} />
              </View>
              <Text style={styles.babyAddText}>Añadir Bebé</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Settings Sections ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.cardGroup}>
            <SettingRow icon="notifications" label="Notificaciones Médicas" value="Activadas" />
            <View style={styles.divider} />
            <SettingRow icon="bluetooth" label="Gestión de Sensores" value="1 Vinculado" />
            <View style={styles.divider} />
            <SettingRow icon="share-social" label="Familia y Cuidadores" value="Invitar" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ayuda y Soporte</Text>
          <View style={styles.cardGroup}>
            <SettingRow icon="document-text" label="Manual Clínico IMSS" />
            <View style={styles.divider} />
            <SettingRow icon="shield-checkmark" label="Privacidad y Datos" />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.cardGroup}>
            <SettingRow icon="log-out" label="Cerrar Sesión" isDestructive={true} onPress={handleLogout} />
          </View>
        </View>

        <Text style={styles.versionText}>TinyCare v1.0.0 (InnovaTecNM 2026)</Text>

      </ScrollView>
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
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.8,
  },
  
  /* Cloud Card */
  cloudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TC.accentLight,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    marginBottom: 32,
    borderCurve: "continuous" as any,
    gap: 16,
  },
  cloudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cloudAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cloudTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TC.textDark,
    marginBottom: 2,
  },
  cloudSub: {
    fontSize: 13,
    color: TC.textBody,
    fontWeight: '500',
  },
  cloudTextContainer: {
    flex: 1,
  },
  cloudBtn: {
    backgroundColor: TC.textDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cloudBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  /* Sections */
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  /* Babies Carousel */
  babiesScroll: {
    gap: 16,
    paddingRight: 20, // To allow scrolling completely to the right
  },
  babyCard: {
    width: 140,
    backgroundColor: TC.card,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderCurve: "continuous" as any,
  },
  babyEmojiBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TC.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  babyEmoji: {
    fontSize: 32,
  },
  babyName: {
    fontSize: 16,
    fontWeight: '700',
    color: TC.textDark,
    marginBottom: 4,
  },
  babyEdit: {
    fontSize: 13,
    fontWeight: '600',
    color: TC.accent,
  },
  babyAddCard: {
    width: 140,
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: TC.inputBorder,
    borderStyle: 'dashed',
    borderCurve: "continuous" as any,
  },
  babyAddIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  babyAddText: {
    fontSize: 15,
    fontWeight: '700',
    color: TC.textMuted,
  },

  /* Settings Group */
  cardGroup: {
    backgroundColor: TC.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    overflow: 'hidden',
    borderCurve: "continuous" as any,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: TC.card,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: TC.accent + "15",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderCurve: "continuous" as any,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TC.textDark,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '500',
    color: TC.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: TC.inputBorder,
    marginLeft: 66, // Align with text
  },
  
  /* Footer */
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    color: TC.textMuted,
    marginTop: 20,
    marginBottom: 40,
  }
});
