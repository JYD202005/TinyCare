import React from 'react';
import { View, StyleSheet } from 'react-native';
import PillInput from './PillInput';
import { TC } from './theme';

interface WebDatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

export default function WebDatePicker({ value, onChange }: WebDatePickerProps) {
  // Convert DD/MM/YYYY to YYYY-MM-DD for the HTML input
  let formattedValue = '';
  if (value) {
    const parts = value.split('/');
    if (parts.length === 3) {
      formattedValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const handleChange = (e: any) => {
    const v = e.target.value; // YYYY-MM-DD
    if (v) {
      const parts = v.split('-');
      if (parts.length === 3) {
        onChange(`${parts[2]}/${parts[1]}/${parts[0]}`); // DD/MM/YYYY
      }
    } else {
      onChange('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Visually, the user sees the beautiful exact same PillInput */}
      <PillInput
        icon="calendar-outline"
        placeholder="Fecha de nac. (DD/MM/AAAA)"
        value={value}
        editable={false}
        containerStyle={styles.pillOverride}
      />
      {/* Functionally, they are clicking an invisible native HTML calendar overlay */}
      <input 
        type="date" 
        value={formattedValue} 
        onChange={handleChange}
        onClick={(e: any) => {
          try {
            if (e.target && typeof e.target.showPicker === 'function') {
              e.target.showPicker();
            }
          } catch(err) {}
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 10,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 16,
    width: '100%',
  },
  pillOverride: {
    marginBottom: 0,
  }
});
