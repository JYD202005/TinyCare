import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../src/services/supabase/client';
import { useRouter } from 'expo-router';
import { TC } from '../components/theme';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/Toast';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const handleRegister = async () => {
    if (!email || !password) {
      showToast('warning', 'Por favor ingresa correo y contraseña.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
      
    setLoading(false);
    if (error) {
      showToast('error', error.message);
    } else {
      // Reclamar invitaciones pendientes
      await supabase.rpc('claim_invites');
      showToast('success', 'Cuenta creada exitosamente. Iniciando sesión...');
      setTimeout(() => router.replace('/(tabs)/home'), 1500);
    }
  };

  return (
    <View style={s.root}>
      {ToastComponent}
      <View style={s.header}>
        <Ionicons name="person-add" size={48} color={TC.vitalHeart} />
        <Text style={s.title}>Crear Cuenta</Text>
        <Text style={s.subtitle}>Mantén a tu bebé siempre monitoreado</Text>
      </View>

      <View style={s.form}>
        <Text style={s.label}>Correo Electrónico</Text>
        <View style={s.inputContainer}>
          <Ionicons name="mail" size={20} color={TC.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="tu@correo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Text style={s.label}>Contraseña</Text>
        <View style={s.inputContainer}>
          <Ionicons name="lock-closed" size={20} color={TC.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="********"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={TC.textMuted} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={TC.vitalHeart} style={{ marginTop: 20 }} />
        ) : (
          <View style={s.buttons}>
            <TouchableOpacity style={s.btnPrimary} onPress={handleRegister}>
              <Text style={s.btnPrimaryText}>Registrar Cuenta</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={s.btnGhost} onPress={() => router.back()}>
              <Text style={s.btnGhostText}>Ya tengo cuenta, iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: TC.textDark, marginTop: 16 },
  subtitle: { fontSize: 16, color: TC.textMuted, textAlign: 'center', marginTop: 8 },
  form: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: TC.textDark, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 16, marginBottom: 20 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: TC.textDark },
  eyeIcon: { padding: 10 },
  buttons: { gap: 12, marginTop: 8 },
  btnPrimary: { backgroundColor: TC.vitalHeart, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnGhost: { padding: 16, alignItems: 'center' },
  btnGhostText: { color: TC.textMuted, fontSize: 14, fontWeight: '600' }
});
