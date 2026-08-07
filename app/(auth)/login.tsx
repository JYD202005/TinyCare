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
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import WaveHeader from '../../components/WaveHeader';
import PillInput from '../../components/PillInput';
import GradientButton from '../../components/GradientButton';
import { TC } from '../../components/theme';
import { useToast } from '../../components/Toast';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const handleLogin = () => {
    console.log('Login:', { email, password });
    showToast('success', 'Sesión iniciada correctamente');
    // Navegar directamente al home sin validación por ahora
    setTimeout(() => router.replace('/(tabs)/home'), 600);
  };

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: 'YOUR_GOOGLE_CLIENT_ID_PLACEHOLDER',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      console.log('Google Auth Success:', authentication);
      showToast('success', 'Sesión iniciada con Google');
      setTimeout(() => router.replace('/(tabs)/home'), 600);
    }
  }, [response]);

  return (
    <View style={styles.root}>
      {ToastComponent}
      {/* Wave background */}
      <WaveHeader height={345} />

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
          {/* ── Logo placeholder on top of the wave ── */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="heart" size={44} color="#FFF" />
            </View>
          </View>

          {/* ── Form section ── */}
          <View style={styles.formSection}>
            <Text style={styles.greeting}>Hola, Papá/Mamá</Text>
            <Text style={styles.subtitle}>
              Inicia sesión en tu cuenta
            </Text>

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
                Mantener sesión iniciada
              </Text>
            </TouchableOpacity>

            {/* Forgot password */}
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Sign In */}
            <GradientButton
              label="INICIAR SESIÓN"
              onPress={handleLogin}
              style={styles.mainBtn}
            />

            {/* Go to register */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>¿No tienes una cuenta? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.switchLink}>Crear Cuenta</Text>
              </TouchableOpacity>
            </View>

            {/* Google Sign In */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O ingresa con</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity 
              style={styles.googleBtn} 
              onPress={() => promptAsync()} 
              disabled={!request}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.googleBtnText}>Continuar con Google</Text>
            </TouchableOpacity>
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

  /* ── Logo ── */
  logoArea: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 80 : 64,
    marginBottom: 8,
    zIndex: 10,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  /* ── Form ── */
  formSection: {
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: TC.textDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: TC.textBody,
    marginBottom: 32,
  },
  inputSpacing: {
    marginBottom: 16,
  },
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

  /* ── Forgot ── */
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: TC.accent,
  },

  /* ── Button ── */
  mainBtn: {
    marginTop: 16,
  },

  /* ── Switch row ── */
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

  /* ── Social Login ── */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: TC.inputBorder,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: TC.textMuted,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 12,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: TC.textDark,
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
