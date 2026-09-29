import { Biometrics } from '../ble/bleTypes';
import { database } from '../../database';
import { Dispositivo, SaludContexto, AlertaMedica as AlertaMedicaModel, TelemetriaCruda } from '../../database/models';
import { Q } from '@nozbe/watermelondb';
import { evaluarLectura, evaluarCrecimiento, MedicionCrecimiento as MedCrec, resolverEstado, AlertaExt, LecturaSensorExt, PerfilSaludExt } from '../../utils/evaluadorMedico';
import { TABLAS_OMS } from '../../utils/tablasOMS';
import { evaluarSenalSensor, evaluarLineaBase, evaluarFiebreSostenida, DiaTemp } from '../../utils/evaluadorComplementario';
import { EstadoActividad } from '../../types/medical';
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
  contexto: PerfilSaludExt;
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

  const dp = (await database.collections.get<any>('datos_personales')
    .query(Q.where('id_perfil', perfilId)).fetch())[0];
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
      edadGestacionalSemanas: contexto.edadGestacionalSemanas,
      // La edad se calcula desde la fecha de nacimiento (no desde grupoEdad/diasDeVida guardados)
      fechaNacimiento: dp?.fechaNacimiento,
      sexo: dp?.sexo === 'Masculino' || dp?.sexo === 'Femenino' ? dp.sexo : undefined,
      circuncidado: dp?.circuncidado ?? undefined,
      pesoNacimientoKg: contexto.pesoNacimientoKg ?? undefined,
      sospechaCardiopatia: contexto.sospechaCardiopatia,
      spo2Basal: contexto.spo2Basal ?? undefined,
      usaOxigenoSuplementario: contexto.usaOxigenoSuplementario ?? undefined,
    },
    lastFetched: now,
  };
  profileCache[deviceId] = profileData;
  return profileData;
};

// ─── Historial, señal y línea base ───────────────────────────────────────────
const historyByDevice: Record<string, LecturaSensorExt[]> = {};
const lastPacket: Record<string, { ms: number; estado: any; perfilId: string }> = {};
const signalTimers: Record<string, ReturnType<typeof setInterval>> = {};
const baseCache: Record<string, { at: number; alertas: AlertaExt[] }> = {};
const batteryPct: Record<string, number | undefined> = {};

const saveAlerts = async (perfilId: string, alertas: AlertaExt[], valor: string) => {
  if (!alertas.length) return;
  const { notifyEmergency, notifyWarning } = getNotify();
  const now = Date.now();
  const orden = { Critico: 0, Advertencia: 1, Info: 2 } as const;
  for (const al of [...alertas].sort((a, b) => orden[a.nivel] - orden[b.nivel])) {
    const key = `${perfilId}-${al.reglaId ?? al.tipo}`;
    const cooldown = al.nivel === 'Critico' ? 15000 : 300000;
    if (lastAlertTimestamp[key] && now - lastAlertTimestamp[key] <= cooldown) continue;
    lastAlertTimestamp[key] = now;
    try {
      await database.write(async () => {
        await database.collections.get<AlertaMedicaModel>('alertas_medicas').create(a => {
          a.idPerfil = perfilId;
          a.tipoAlerta = al.tipo;
          a.nivel = al.nivel;
          a.mensajeMedico = al.mensaje;
          a.valorRegistrado = valor;
          a.timestampEvento = now;
          a.leida = false;
          a.isSynced = false;
        });
      });
    } catch (e) { console.warn('Error saving alert:', e); }
    if (al.nivel === 'Critico') notifyEmergency('Alerta Médica Crítica', al.mensaje);
    else if (al.nivel === 'Advertencia') notifyWarning('Atención Pediátrica', al.mensaje);
  }
};

// Vigila que sigan llegando paquetes (arranca solo al primer paquete de cada dispositivo)
const startSignalWatch = (deviceId: string) => {
  if (signalTimers[deviceId]) return;
  signalTimers[deviceId] = setInterval(() => {
    const p = lastPacket[deviceId];
    if (!p) return;
    saveAlerts(p.perfilId, evaluarSenalSensor({ ultimoPaqueteMs: p.ms, estado: p.estado, bateriaPct: batteryPct[deviceId] }), 'sin señal');
  }, 30000);
};
export const stopSignalWatch = (deviceId: string) => {
  clearInterval(signalTimers[deviceId]);
  delete signalTimers[deviceId];
  delete lastPacket[deviceId];
};

// Crecimiento: se evalúa 1 vez al día por perfil con el historial de pesos (edad siempre desde fecha de nacimiento)
const lastGrowthCheck: Record<string, number> = {};
const checkGrowth = async (perfilId: string, perfil: PerfilSaludExt) => {
  const now = Date.now();
  if (now - (lastGrowthCheck[perfilId] ?? 0) < 86400000) return;
  lastGrowthCheck[perfilId] = now;
  const rows = await database.collections.get<any>('mediciones_crecimiento').query(Q.where('id_perfil', perfilId)).fetch();
  const meds: MedCrec[] = rows.map((r: any) => ({ fecha: r.fechaMedicion, pesoKg: r.pesoKg, longitudCm: r.longitudCm ?? undefined }));
  const alertas = evaluarCrecimiento(perfil, meds, { ahora: now, tablas: TABLAS_OMS }).filter(a => a.reglaId !== 'SIN_TABLAS');
  await saveAlerts(perfilId, alertas, 'crecimiento');
};

// Fiebre sostenida: 1 vez al día, máxima temperatura válida por día LOCAL de los últimos 7 días
const lastFeverCheck: Record<string, number> = {};
const diaLocal = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const checkFeverDays = async (perfilId: string) => {
  const now = Date.now();
  if (now - (lastFeverCheck[perfilId] ?? 0) < 86400000) return;
  lastFeverCheck[perfilId] = now;
  const rows = await database.collections.get<TelemetriaCruda>('telemetria_cruda').query(
    Q.where('id_perfil', perfilId), Q.where('timestamp_medicion', Q.gte(now - 7 * 86400000))).fetch();
  const porDia: Record<string, number> = {};
  for (const r of rows) {
    if (r.temp < 34 || r.temp > 42) continue; // descarta lecturas imposibles (sensor suelto)
    const d = diaLocal(r.timestampMedicion);
    porDia[d] = Math.max(porDia[d] ?? 0, r.temp);
  }
  const dias: DiaTemp[] = Object.entries(porDia).map(([dia, tempMax]) => ({ dia, tempMax }));
  await saveAlerts(perfilId, evaluarFiebreSostenida(dias), 'fiebre varios días');
};

// Línea base: lecturas dormidas de 7 días (se recalcula máx. cada 10 min)
const getBaselineAlerts = async (perfilId: string, recientes: LecturaSensorExt[]) => {
  const now = Date.now();
  const c = baseCache[perfilId];
  if (c && now - c.at < 600000) return c.alertas;
  const rows = await database.collections.get<TelemetriaCruda>('telemetria_cruda').query(
    Q.where('id_perfil', perfilId), Q.where('timestamp_medicion', Q.gte(now - 7 * 86400000)),
    Q.where('actividad', 'Sueño')).fetch();
  const ultimos7dias = rows.map(r => ({ fc: r.fc, fr: r.fr, spo2: r.spo2, temp: r.temp, actividad: 'Sueño' as EstadoActividad }));
  const alertas = evaluarLineaBase({ ultimos7dias, recientes });
  baseCache[perfilId] = { at: now, alertas };
  return alertas;
};

// ─── Evaluación clínica de signos vitales ─────────────────────────────────────

export const evaluateBiometrics = async (data: Biometrics, deviceId?: string) => {
  const { notifyEmergency, notifyWarning } = getNotify();
  const now = Date.now();

  let perfilContexto: PerfilSaludExt | null = null;
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

  // Actividad real enviada por el MPU6050 del ESP32 (fusión sensorial v2)
  const actividad: EstadoActividad = data.activity;

  // --- EVALUACIÓN MEDICA INTELIGENTE (Requiere Perfil) ---
  if (perfilContexto && perfilId) {
    const ex = (data as any).extra ?? {};
    const lectura: LecturaSensorExt = {
      fc: data.heartRate,
      fr: data.respiratoryRate,
      spo2: data.oxygenSaturation,
      temp: data.temperature,
      actividad: data.activity,
      ...ex,
    };
    const hist = (historyByDevice[deviceId!] ??= []);
    lastPacket[deviceId!] = { ms: now, estado: resolverEstado(lectura), perfilId };
    batteryPct[deviceId!] = (data as any).battery ?? batteryPct[deviceId!];
    startSignalWatch(deviceId!);
    checkGrowth(perfilId, perfilContexto).catch(() => {});
    checkFeverDays(perfilId).catch(() => {});

    const resultado = evaluarLectura(lectura, perfilContexto, { ahora: now, historial: hist });
    hist.push(lectura);
    if (hist.length > 10) hist.shift();
    
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

    const valor = `FC:${lectura.fc} SpO2:${lectura.spo2} T:${lectura.temp}`;
    let alertas: AlertaExt[] = resultado.alertas;
    try { alertas = alertas.concat(await getBaselineAlerts(perfilId, [...hist])); } catch (e) { /* sin base aún */ }
    await saveAlerts(perfilId, alertas, valor);
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
