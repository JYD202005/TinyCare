import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import WaveHeader from '../../components/WaveHeader';
import PillInput from '../../components/PillInput';
import GradientButton from '../../components/GradientButton';
import { TC } from '../../components/theme';

export default function RegisterScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleRegister = () => {
    console.log('Register:', {
      firstName,
      lastName,
      email,
      phone,
      password,
      acceptTerms,
    });
  };

  return (
    <View style={styles.root}>
      {/* Wave background */}
      <WaveHeader height={300} flip={true} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Back button ── */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>

          {/* ── Avatar placeholder ── */}
          <View style={styles.avatarArea}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color={TC.textMuted} />
              </View>
              <TouchableOpacity style={styles.avatarBadge} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Form section ── */}
          <View style={styles.formSection}>
            {/* Name row */}
            <View style={styles.nameRow}>
              <PillInput
                icon="person-outline"
                placeholder="Nombre(s)"
                value={firstName}
                onChangeText={setFirstName}
                containerStyle={[styles.inputSpacing, styles.nameInput]}
              />
              <PillInput
                icon="person-outline"
                placeholder="Apellidos"
                value={lastName}
                onChangeText={setLastName}
                containerStyle={[styles.inputSpacing, styles.nameInput]}
              />
            </View>

            {/* Email */}
            <PillInput
              icon="mail-outline"
              placeholder="Correo Electrónico"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              containerStyle={styles.inputSpacing}
            />

            {/* Phone */}
            <PillInput
              icon="call-outline"
              placeholder="Teléfono"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              containerStyle={styles.inputSpacing}
            />

            {/* Password */}
            <PillInput
              icon="lock-closed-outline"
              placeholder="Contraseña"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              rightIcon={showPassword ? 'eye-outline' : 'eye-off-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              containerStyle={styles.inputSpacing}
            />

            {/* Terms */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptTerms(!acceptTerms)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptTerms && styles.checkboxChecked,
                ]}
              >
                {acceptTerms && (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                )}
              </View>
              <Text style={styles.termsText}>
                Acepto los términos y condiciones de TinyCare
              </Text>
            </TouchableOpacity>

            {/* Sign Up */}
            <GradientButton
              label="CREAR CUENTA"
              onPress={handleRegister}
              style={styles.mainBtn}
            />

            {/* ── Social section ── */}
            <View style={styles.socialSection}>
              <Text style={styles.socialLabel}>
                O crea tu cuenta usando redes sociales
              </Text>
              <View style={styles.socialRow}>
                {/* Google */}
                <TouchableOpacity
                  style={[styles.socialCircle, { backgroundColor: TC.socialGoogle }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-google" size={22} color="#FFF" />
                </TouchableOpacity>
                {/* Facebook */}
                <TouchableOpacity
                  style={[styles.socialCircle, { backgroundColor: TC.socialFacebook }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-facebook" size={22} color="#FFF" />
                </TouchableOpacity>
                {/* Twitter */}
                <TouchableOpacity
                  style={[styles.socialCircle, { backgroundColor: TC.socialTwitter }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-twitter" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Switch to login */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>¿Ya tienes una cuenta? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.switchLink}>Iniciar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Footer ── */}
          <Text style={styles.footer}>
            Acompañando a tu bebé, en cada latido
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ───────────── Styles ───────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TC.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  /* ── Back ── */
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },

  /* ── Avatar ── */
  avatarArea: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 80 : 60,
    marginBottom: 12,
    zIndex: 10,
  },
  avatarOuter: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: TC.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: TC.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  /* ── Form ── */
  formSection: {
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  inputSpacing: {
    marginBottom: 14,
  },

  /* ── Terms ── */
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
    backgroundColor: TC.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: TC.checkmark,
    borderColor: TC.checkmark,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: TC.textBody,
  },

  /* ── Button ── */
  mainBtn: {
    marginTop: 16,
  },

  /* ── Social ── */
  socialSection: {
    alignItems: 'center',
    marginTop: 28,
  },
  socialLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: TC.textMuted,
    marginBottom: 16,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
  },
  socialCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  /* ── Switch ── */
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
    color: TC.textBody,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
    color: TC.accent,
  },

  /* ── Footer ── */
  footer: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    color: TC.accent,
    marginTop: 'auto',
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
});
