import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../src/services/supabase/client';
import { useRouter } from 'expo-router';
import { TC } from '../components/theme';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../src/providers/AuthProvider';

export default function InviteCaregiverScreen() {
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { session } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const handleInvite = async () => {
    if (!session) {
      showToast('warning', 'Debes iniciar sesión para invitar cuidadores.');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }
    if (!email.includes('@')) {
      showToast('error', 'Ingresa un correo válido.');
      return;
    }
    
    // Need profile ID
    // We fetch the first profile from local DB just as a reference, or if user has selected one
    // Assuming the user is sharing their main baby profile.
    setLoading(true);
    
    // 1. Fetch current profile from WatermelonDB to get ID
    const Perfil = require('../src/database/models').Perfil;
    const { database } = require('../src/database');
    const perfiles = await database.get('perfiles').query().fetch();
    
    if (perfiles.length === 0) {
      setLoading(false);
      showToast('error', 'No tienes un perfil de bebé creado para compartir.');
      return;
    }

    const babyId = perfiles[0].id;

    const { data: message, error } = await supabase.rpc('invite_caregiver', {
      p_id_perfil: babyId,
      p_email: email.trim().toLowerCase(),
      p_rol: description.trim() || 'Cuidador/Familiar'
    });

    setLoading(false);

    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', message || `Se ha habilitado el acceso para ${email}.`);
      setTimeout(() => router.back(), 2500);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={s.root} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {ToastComponent}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={TC.textDark} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Invitar Cuidador</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.iconWrapper}>
          <Ionicons name="mail-unread" size={64} color={TC.vitalHeart} />
        </View>
        
        <Text style={s.title}>Compartir Acceso Remoto</Text>
        <Text style={s.subtitle}>
          Busca a un familiar o cuidador por su correo electrónico. Si ya tienen cuenta en TinyCare, se vincularán automáticamente al perfil del bebé.
        </Text>

        <View style={s.form}>
          <Text style={s.label}>Correo Electrónico</Text>
          <View style={s.inputWrapper}>
            <Ionicons name="search" size={20} color={TC.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="correo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={s.label}>Alias / Descripción (Opcional)</Text>
          <View style={s.inputWrapper}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={TC.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Ej. Abuela, Pediatra, etc."
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={TC.vitalHeart} style={{ marginTop: 24 }} />
          ) : (
            <TouchableOpacity style={s.btnPrimary} onPress={handleInvite}>
              <Text style={s.btnPrimaryText}>Enviar Solicitud</Text>
              <Ionicons name="send" size={18} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#FFF' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TC.textDark },
  content: { padding: 24, alignItems: 'center' },
  iconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: TC.textDark, marginBottom: 12 },
  subtitle: { fontSize: 15, color: TC.textBody, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  form: { width: '100%', backgroundColor: '#FFF', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: TC.textDark, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: TC.textDark },
  btnPrimary: { flexDirection: 'row', backgroundColor: TC.vitalHeart, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
