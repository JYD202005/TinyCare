/**
 * Toast.tsx — TinyCare
 * Banners de notificación estilo toast: success, warning, error.
 * Se muestran en la parte superior de la pantalla y desaparecen automáticamente.
 *
 * Uso:
 *   const { showToast, ToastComponent } = useToast();
 *   showToast('success', 'Guardado correctamente');
 *   // En el JSX: {ToastComponent}
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'warning' | 'error';

interface ToastConfig {
  type: ToastType;
  message: string;
  duration?: number; // ms, default 3000
}

// ─── Design tokens per type ───────────────────────────────────────────────────

const TOAST_STYLES: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: string; iconColor: string }
> = {
  success: {
    bg: '#F0FDF4',
    border: '#4ADE80',
    text: '#166534',
    icon: 'checkmark-circle',
    iconColor: '#22C55E',
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FCD34D',
    text: '#92400E',
    icon: 'warning',
    iconColor: '#F59E0B',
  },
  error: {
    bg: '#FFF1F2',
    border: '#FCA5A5',
    text: '#991B1B',
    icon: 'close-circle',
    iconColor: '#EF4444',
  },
};

// ─── Toast Component ──────────────────────────────────────────────────────────

interface ToastProps {
  type: ToastType;
  message: string;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ type, message, onDismiss }) => {
  const s = TOAST_STYLES[type];
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.toast,
          { backgroundColor: s.bg, borderLeftColor: s.border },
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: s.border + '33' }]}>
          <Ionicons name={s.icon as any} size={22} color={s.iconColor} />
        </View>

        {/* Message */}
        <Text style={[styles.message, { color: s.text }]} numberOfLines={3}>
          {message}
        </Text>

        {/* Dismiss */}
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={s.text + 'AA'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useToast = () => {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: ToastType, message: string, duration = 3500) => {
    // Cancel existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ type, message, duration });

    timerRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const ToastComponent = toast ? (
    <Toast
      key={`${toast.type}-${toast.message}`}
      type={toast.type}
      message={toast.message}
      onDismiss={hideToast}
    />
  ) : null;

  return { showToast, hideToast, ToastComponent };
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
    flexShrink: 0,
  },
});
