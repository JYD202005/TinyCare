import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TC } from './theme';

interface PillInputProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle | ViewStyle[];
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

/**
 * Pill-shaped TextInput with optional left/right icons.
 * Uses warm theme tokens for consistent look.
 */
export default function PillInput({
  icon,
  containerStyle,
  rightIcon,
  onRightIconPress,
  ...rest
}: PillInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {icon && (
        <Ionicons
          name={icon}
          size={19}
          color={TC.textMuted}
          style={styles.leftIcon}
        />
      )}
      <TextInput
        style={styles.input}
        placeholderTextColor={TC.textMuted}
        {...rest}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
          <Ionicons name={rightIcon} size={19} color={TC.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TC.inputBg,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    height: 52,
    paddingHorizontal: 20,
    elevation: 1,
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  leftIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: TC.textDark,
    fontWeight: '400',
  },
  rightIcon: {
    padding: 6,
  },
});
