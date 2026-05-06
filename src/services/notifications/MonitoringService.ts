import { Biometrics } from '../ble/bleTypes';
import { database } from '../../database';
import { Dispositivo, SaludContexto, AlertaMedica as AlertaMedicaModel, TelemetriaCruda } from '../../database/models';
import { Q } from '@nozbe/watermelondb';
import { evaluarLectura } from '../../utils/evaluadorMedico';
import { LecturaSensor, PerfilSalud, EstadoActividad } from '../../types/medical';
import { updateForegroundNotification } from './ForegroundService';

// Guardamos el último estado para no spamear la misma notificación
let lastStatus = {
  spo2: 'normal',
  hr: 'normal',
  temp: 'normal',
};

// Caché para no consultar la DB cada segundo
let profileCache: Record<string, {
  perfilId: string;
  contexto: PerfilSalud;
  lastFetched: number;
}> = {};

// Throttle telemetria_cruda inserts (una por minuto a menos que haya anomalía)
let lastTelemetryInsert = 0;
let lastAlertTimestamp: Record<string, number> = {};

// ─── Emitter para UI en tiempo real ──────────────────────────────────────────
type BiometricsListener = (deviceId: string, data: Biometrics) => void;
const listeners = new Set<BiometricsListener>();

export const subscribeToBiometrics = (listener: BiometricsListener) => {
  listeners.add(listener);
  // When a new listener registers, also forward data to it via evaluateBiometrics
  // No extra code needed here; evaluateBiometrics is called within the data flow
  return () => { listeners.delete(listener); };
};

// ─── Lazy imports de NotificationService ─────────────────────────────────────
const getNotify = () => require('./NotificationService') as typeof import('./NotificationService');

const getProfileForDevice = async (deviceId: string) => {
  const now = Date.now();
  if (profileCache[deviceId] && (now - profileCache[deviceId].lastFetched < 60000)) {
    return profileCache[deviceId];
  }

  const dispositivos = await database.collections.get<Dispositivo>('dispositivos')
    .query(Q.where('identificador_hardware', deviceId)).fetch();

  if (dispositivos.length === 0) return null;
  const perfilId = dispositivos[0].idPerfil;

  const contextos = await database.collections.get<SaludContexto>('salud_contexto')
    .query(Q.where('id_perfil', perfilId)).fetch();

  if (contextos.length === 0) return null;
  const contexto = contextos[0];

  const profileData = {
    perfilId,
    contexto: {
      id: perfilId,
      grupoEdad: contexto.grupoEdad as any,
      esPrematuro: contexto.esPrematuro,
      altoRiesgoSDR: contexto.altoRiesgoSdr,
      pesoKg: contexto.pesoKg,
      diasDeVida: contexto.diasDeVida,
      edadGestacionalSemanas: contexto.edadGestacionalSemanas
    },
    lastFetched: now,
  };
  profileCache[deviceId] = profileData;
  return profileData;
};

// ─── Evaluación clínica de signos vitales ─────────────────────────────────────

export const evaluateBiometrics = async (data: Biometrics, deviceId?: string) => {
  const { notifyEmergency, notifyWarning } = getNotify();
  const now = Date.now();

  let perfilContexto: PerfilSalud | null = null;
  let perfilId = '';

  if (deviceId) {
    // Emitir a la UI que está escuchando en tiempo real
    listeners.forEach(l => l(deviceId, data));

    const cached = await getProfileForDevice(deviceId);
    if (cached) {
      perfilContexto = cached.contexto;
      perfilId = cached.perfilId;
    }
    
    // Actualizar la notificación persistente
    updateForegroundNotification(data);
  }

  // Actividad estimada (En la v2 vendrá desde un acelerómetro, ahora es default)
  const actividad: EstadoActividad = 'Reposo'; 

  // --- EVALUACIÓN MEDICA INTELIGENTE (Requiere Perfil) ---
  if (perfilContexto && perfilId) {
    const lectura: LecturaSensor = {
      fc: data.heartRate,
      fr: data.respiratoryRate, // En ESP32 esto podría estar simulado o calculado
      spo2: data.oxygenSaturation,
      temp: data.temperature,
      actividad
    };

    const resultado = evaluarLectura(lectura, perfilContexto);
    
    // Inserción en Telemetria Cruda cada 60s o de inmediato si hay anomalía
    const shouldInsertTelemetry = resultado.esAnomalia || (now - lastTelemetryInsert > 60000);

    if (shouldInsertTelemetry) {
      lastTelemetryInsert = now;
      try {
        await database.write(async () => {
          await database.collections.get<TelemetriaCruda>('telemetria_cruda').create(t => {
            t.idPerfil = perfilId;
            t.fc = lectura.fc;
            t.fr = lectura.fr;
            t.spo2 = lectura.spo2;
            t.temp = lectura.temp;
            t.actividad = lectura.actividad;
            t.esAnomalia = resultado.esAnomalia;
            t.timestampMedicion = now;
            t.isSynced = false;
          });
        });
      } catch (e) {
        console.warn('Error inserting telemetry:', e);
      }
    }

    if (resultado.alertas.length > 0) {
      const highestAlert = resultado.alertas.sort((a, b) => (a.nivel === 'Critico' ? -1 : 1))[0];
      const alertKey = `${perfilId}-${highestAlert.tipo}`;
      
      // Prevenir SPAM: alertas normales cada 5 mins, críticas cada 15 segundos para insistir
      const cooldown = highestAlert.nivel === 'Critico' ? 15000 : 300000;
      if (!lastAlertTimestamp[alertKey] || (now - lastAlertTimestamp[alertKey] > cooldown)) {
        lastAlertTimestamp[alertKey] = now;
        
        try {
          await database.write(async () => {
            await database.collections.get<AlertaMedicaModel>('alertas_medicas').create(a => {
              a.idPerfil = perfilId;
              a.tipoAlerta = highestAlert.tipo;
              a.nivel = highestAlert.nivel;
              a.mensajeMedico = highestAlert.mensaje;
              a.valorRegistrado = `FC:${lectura.fc} SpO2:${lectura.spo2} T:${lectura.temp}`;
              a.timestampEvento = now;
              a.leida = false;
              a.isSynced = false;
            });
          });
        } catch (e) {
          console.warn('Error saving alert:', e);
        }

        if (highestAlert.nivel === 'Critico') {
           notifyEmergency('Alerta Médica Crítica', highestAlert.mensaje);
        } else if (highestAlert.nivel === 'Advertencia') {
           notifyWarning('Atención Pediátrica', highestAlert.mensaje);
        }
      }
    }
  } else {
    // --- EVALUACIÓN FALLBACK (Sin Perfil / Sin Dispositivo ID) ---
    const { oxygenSaturation: spo2, heartRate: hr, temperature: temp } = data;

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
  }
};

// ─── Avisos de estado del hardware ───────────────────────────────────────────

export const notifyHardwareStatus = (event: 'low_battery' | 'disconnected' | 'connected') => {
  const { notifyWarning, notifyCommon } = getNotify();

  if (event === 'low_battery') {
    notifyWarning('Batería Baja', 'El sensor de TinyCare tiene poca batería. Por favor, ponlo a cargar pronto.');
  } else if (event === 'disconnected') {
    notifyWarning('Sensor Desconectado', 'Se perdió la conexión con el monitor TinyCare. Verifica la cercanía y batería.');
  } else if (event === 'connected') {
    notifyCommon('Sensor Conectado', 'El monitor TinyCare está activo y vigilando.');
  }
};
