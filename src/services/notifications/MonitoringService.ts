import { notifyCommon, notifyWarning, notifyEmergency } from './NotificationService';
import { Biometrics } from '../ble/bleTypes';

// Guardamos el último estado para no spamear la misma notificación
let lastStatus = {
  spo2: 'normal',
  hr: 'normal',
  temp: 'normal',
};

// Evaluación clínica de los signos vitales
export const evaluateBiometrics = (data: Biometrics) => {
  const { oxygenSaturation: spo2, heartRate: hr, temperature: temp } = data;

  // --- EVALUACIÓN SpO2 ---
  if (spo2 > 0) {
    if (spo2 <= 90) {
      if (lastStatus.spo2 !== 'emergency') {
        notifyEmergency('Hipoxia Crítica', `La oxigenación bajó a ${spo2}%. ¡Atención médica inmediata requerida!`);
        lastStatus.spo2 = 'emergency';
      }
    } else if (spo2 <= 94) {
      if (lastStatus.spo2 !== 'warning') {
        notifyWarning('Oxigenación Baja', `El nivel de SpO2 es de ${spo2}%. Vigila la respiración del bebé.`);
        lastStatus.spo2 = 'warning';
      }
    } else {
      lastStatus.spo2 = 'normal';
    }
  }

  // --- EVALUACIÓN Frecuencia Cardíaca (BPM) ---
  // Rango normal aprox 100-160 para bebés
  if (hr > 0) {
    if (hr > 200 || hr < 60) {
      if (lastStatus.hr !== 'emergency') {
        notifyEmergency('Ritmo Cardíaco Anormal', `Frecuencia peligrosa de ${hr} BPM. ¡Revisa al bebé urgentemente!`);
        lastStatus.hr = 'emergency';
      }
    } else if (hr > 170 || hr < 80) {
      if (lastStatus.hr !== 'warning') {
        notifyWarning('Frecuencia Cardíaca Inusual', `El pulso está en ${hr} BPM. Mantén al bebé en observación.`);
        lastStatus.hr = 'warning';
      }
    } else {
      lastStatus.hr = 'normal';
    }
  }

  // --- EVALUACIÓN Temperatura ---
  if (temp > 0) {
    if (temp >= 39.5 || temp <= 35.0) {
      if (lastStatus.temp !== 'emergency') {
        notifyEmergency('Temperatura Extrema', `Temperatura de ${temp}°C. Riesgo grave, toma medidas inmediatas.`);
        lastStatus.temp = 'emergency';
      }
    } else if (temp >= 38.0 || temp <= 36.0) {
      if (lastStatus.temp !== 'warning') {
        notifyWarning('Cambio de Temperatura', `Temperatura en ${temp}°C. Posible fiebre o hipotermia leve.`);
        lastStatus.temp = 'warning';
      }
    } else {
      lastStatus.temp = 'normal';
    }
  }
};

// Avisos de estado del hardware
export const notifyHardwareStatus = (event: 'low_battery' | 'disconnected' | 'connected') => {
  if (event === 'low_battery') {
    notifyWarning('Batería Baja', 'El sensor de TinyCare tiene poca batería. Por favor, ponlo a cargar pronto.');
  } else if (event === 'disconnected') {
    notifyWarning('Sensor Desconectado', 'Se perdió la conexión con el monitor TinyCare. Verifica la cercanía y batería.');
  } else if (event === 'connected') {
    notifyCommon('Sensor Conectado', 'El monitor TinyCare está activo y vigilando.');
  }
};
