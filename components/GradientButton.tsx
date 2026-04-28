import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TC } from './theme';

interface GradientButtonProps {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Pill-shaped button with the pink → blue pastel gradient.
 */
export default function GradientButton({
  label,
  onPress,
  style,
  textStyle,
}: GradientButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.wrapper, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[TC.gradientStart, TC.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={[styles.label, textStyle]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 9999,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: TC.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  gradient: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
  },
  label: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
