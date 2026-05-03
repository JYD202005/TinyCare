import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TC } from './theme';

interface ComboDatePickerProps {
  value: string; // Formato DD/MM/YYYY
  onChange: (date: string) => void;
  containerStyle?: any;
}

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export default function ComboDatePicker({ value, onChange, containerStyle }: ComboDatePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeCombo, setActiveCombo] = useState<'day' | 'month' | 'year' | null>(null);

  // Parse current value (e.g. "12/05/2026")
  const parts = value ? value.split('/') : [];
  const currentDay = parts[0] || '';
  const currentMonth = parts[1] || '';
  const currentYear = parts[2] || '';

  const currentYearNum = new Date().getFullYear();
  // Años desde 2010 hasta el año actual
  const years = useMemo(() => {
    const y = [];
    for (let i = currentYearNum; i >= currentYearNum - 20; i--) {
      y.push(i.toString());
    }
    return y;
  }, [currentYearNum]);

  // Días del 1 al 31
  const days = useMemo(() => {
    const d = [];
    for (let i = 1; i <= 31; i++) {
      d.push(i.toString().padStart(2, '0'));
    }
    return d;
  }, []);

  const openModal = (type: 'day' | 'month' | 'year') => {
    setActiveCombo(type);
    setModalVisible(true);
  };

  const handleSelect = (item: string) => {
    let newD = currentDay;
    let newM = currentMonth;
    let newY = currentYear;

    if (activeCombo === 'day') newD = item;
    if (activeCombo === 'month') newM = item;
    if (activeCombo === 'year') newY = item;

    // Autocompletar con valores por defecto si falta alguno
    if (!newD) newD = '01';
    if (!newM) newM = '01';
    if (!newY) newY = currentYearNum.toString();

    onChange(`${newD}/${newM}/${newY}`);
    setModalVisible(false);
  };

  const getListData = () => {
    if (activeCombo === 'day') return days.map(d => ({ label: d, value: d }));
    if (activeCombo === 'month') return MONTHS.map((m, i) => ({ label: m, value: (i + 1).toString().padStart(2, '0') }));
    if (activeCombo === 'year') return years.map(y => ({ label: y, value: y }));
    return [];
  };

  const data = getListData();

  const getMonthLabel = (m: string) => {
    const idx = parseInt(m, 10) - 1;
    if (idx >= 0 && idx < 12) return MONTHS[idx];
    return 'Mes';
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>FECHA DE NACIMIENTO</Text>
      <View style={styles.row}>
        {/* Día */}
        <TouchableOpacity style={styles.comboBtn} onPress={() => openModal('day')}>
          <Text style={currentDay ? styles.comboTextSelected : styles.comboText}>
            {currentDay || 'Día'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={TC.textMuted} />
        </TouchableOpacity>

        {/* Mes */}
        <TouchableOpacity style={styles.comboBtn} onPress={() => openModal('month')}>
          <Text style={currentMonth ? styles.comboTextSelected : styles.comboText}>
            {currentMonth ? getMonthLabel(currentMonth) : 'Mes'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={TC.textMuted} />
        </TouchableOpacity>

        {/* Año */}
        <TouchableOpacity style={styles.comboBtn} onPress={() => openModal('year')}>
          <Text style={currentYear ? styles.comboTextSelected : styles.comboText}>
            {currentYear || 'Año'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={TC.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Selecciona {activeCombo === 'day' ? 'Día' : activeCombo === 'month' ? 'Mes' : 'Año'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={TC.textBody} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelect(item.value)}>
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: TC.textBody,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  comboBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: TC.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 52,
  },
  comboText: {
    fontSize: 14,
    color: TC.textMuted,
  },
  comboTextSelected: {
    fontSize: 14,
    color: TC.textDark,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '50%',
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TC.textDark,
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemText: {
    fontSize: 16,
    color: TC.textDark,
    textAlign: 'center',
    fontWeight: '500',
  },
});
