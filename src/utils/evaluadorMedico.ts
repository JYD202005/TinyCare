import { PerfilSalud, LecturaSensor, ResultadoEvaluacion, AlertaMedica } from '../types/medical';

/**
 * Evaluador clínico TinyCare (0 a 24 meses).
 *
 * Etiquetas de confianza (ver CONTEXTO_CLINICO_TINYCARE.md):
 *   [LIBRO]     verificado en los PDFs (Wong, Neonatología, Lippincott, Primer contacto)
 *   [REF]       estándar externo (OMS / AHA-PALS), verificar contra tabla oficial
 *   [PROPUESTA] criterio de ingeniería, requiere validación de un pediatra/neonatólogo
 *
 * Todos los umbrales viven en las tablas de constantes de abajo para que un clínico
 * pueda ajustarlos sin tocar la lógica.
 *
 * Compatibilidad: `evaluarLectura(lectura, perfil)` sigue funcionando igual que antes
 * (sin historial no aplica persistencia). Los campos nuevos son opcionales.
 */

// ============================================================
// TIPOS (mover a types/medical.ts cuando se estabilicen)
// ============================================================
export type Nivel = 'Info' | 'Advertencia' | 'Critico';
type Grupo = 'Neonato' | 'Lactante' | 'LactanteMayor';
export type Categoria = 'FC' | 'FR' | 'SPO2' | 'TEMP' | 'PA' | 'POSTURA' | 'NEURO' | 'SENSOR' | 'COMPUESTO' | 'CRECIMIENTO';

export interface PerfilSaludExt extends Omit<PerfilSalud, 'sospechaCardiopatia'> {
  sexo?: 'Femenino' | 'Masculino';
  /** epoch ms. Fuente de verdad de la edad (NO usar grupoEdad/diasDeVida guardados). */
  fechaNacimiento?: number;
  /** Solo relevante para el aviso de infección urinaria en varones con fiebre [LIBRO:LIPP]. */
  circuncidado?: boolean;
  pesoNacimientoKg?: number;
  sospechaCardiopatia?: boolean;
  /** SpO2 basal fijada por el médico (cardiopatía). Si existe reemplaza el umbral genérico de 92%. */
  spo2Basal?: number;
  /** Los objetivos 85-90% de prematuro aplican SOLO con oxígeno suplementario [LIBRO:NEO]. */
  usaOxigenoSuplementario?: boolean;
}

/**
 * Estado de sueño DECLARADO (modo "está durmiendo" en la app) o inferido por el firmware.
 * Si viene, manda sobre 'Reposo'/'Sueño' de `actividad`. 'desconocido' = no se sabe.
 */
export type EstadoSueno = 'dormido' | 'despierto' | 'desconocido';
/**
 * Estado resuelto que usan las reglas:
 *  dormido  · despierto (quieto y despierto) · reposo (quieto, sin saber si duerme) · inquieto · llanto
 */
export type EstadoResuelto = 'dormido' | 'despierto' | 'reposo' | 'inquieto' | 'llanto';

export interface LecturaSensorExt extends LecturaSensor {
  timestamp?: number;
  /** Ver EstadoSueno. Si no se envía, 'Reposo' se trata como "reposo sin confirmar". */
  estadoSueno?: EstadoSueno;
  /** true SOLO si la FR es medida (acelerómetro/PPG). Con bpm/4 debe ser false/undefined. */
  frMedida?: boolean;
  /** Segundos desde la última respiración detectada (si el firmware/parser lo calcula). */
  pausaRespiratoriaSeg?: number;
  calidadSenal?: 'buena' | 'regular' | 'mala';
  movimientoFuerte?: boolean;
  sitioTemperatura?: 'axilar' | 'piel' | 'rectal';
  posicion?: 'boca_arriba' | 'boca_abajo' | 'lado' | 'desconocida';
  segundosEnPosicion?: number;
  /** Segundos de movimiento rítmico/tónico sostenido detectado por el acelerómetro. */
  patronConvulsivoSeg?: number;
}

export interface AlertaExt extends AlertaMedica {
  reglaId?: string;
  categoria?: Categoria;
  evidencia?: Record<string, number | string | boolean>;
}
interface AlertaInterna extends AlertaExt {
  inmediata?: boolean;
}

export interface ResultadoEvaluacionExt extends ResultadoEvaluacion {
  alertas: AlertaExt[];
  puntaje: number;
  edad: EdadCalculada;
  estado: EstadoResuelto;
  /** Alertas detectadas pero aún sin confirmar por persistencia (no se notifican). */
  pendientesPersistencia: number;
}

export interface OpcionesEvaluacion {
  ahora?: number;
  /** Lecturas previas del mismo bebé, de la más antigua a la más reciente, SIN la actual. */
  historial?: LecturaSensorExt[];
}

// ============================================================
// 1. EDAD (corregida por prematuridad)
// ============================================================
const MS_DIA = 86_400_000;

export interface EdadCalculada {
  diasCron: number;
  diasCorregida: number;
  /** Grupo según edad CORREGIDA: se usa para rangos de FC/FR. */
  grupo: Grupo;
  edadAnios: number;
  fuente: 'fecha_nacimiento' | 'dias_de_vida' | 'grupo_estatico';
  /** true si > 24 meses o fecha inválida: fuera del alcance de la app. */
  fueraDeRango: boolean;
}

export function grupoDesdeDias(dias: number): Grupo {
  if (dias <= 28) return 'Neonato';
  if (dias <= 365) return 'Lactante';
  return 'LactanteMayor';
}

/** Edad corregida por prematuridad: solo si la gestación fue < 37 semanas. */
export function corregirDias(diasCron: number, semanasGestacion?: number): number {
  return semanasGestacion !== undefined && semanasGestacion < 37
    ? Math.max(0, diasCron - (40 - semanasGestacion) * 7)
    : diasCron;
}

export function calcularEdad(perfil: PerfilSaludExt, ahora: number = Date.now()): EdadCalculada {
  let diasCron: number;
  let fuente: EdadCalculada['fuente'];

  if (perfil.fechaNacimiento !== undefined) {
    diasCron = Math.floor((ahora - perfil.fechaNacimiento) / MS_DIA);
    fuente = 'fecha_nacimiento';
  } else if (perfil.diasDeVida !== undefined) {
    diasCron = perfil.diasDeVida;
    fuente = 'dias_de_vida'; // puede estar desactualizado (hueco #8)
  } else {
    // Último recurso: punto medio de cada grupo. Es un valor estático.
    const g = perfil.grupoEdad as string;
    diasCron = g === 'Neonato' ? 14 : g === 'Lactante' ? 180 : 545;
    fuente = 'grupo_estatico';
  }

  const fueraDeRango = diasCron < 0 || diasCron > 730;
  diasCron = Math.max(0, diasCron);

  const sem = perfil.edadGestacionalSemanas;
  const diasCorregida = diasCron <= 730 ? corregirDias(diasCron, sem) : diasCron;

  return {
    diasCron,
    diasCorregida,
    grupo: grupoDesdeDias(diasCorregida),
    edadAnios: diasCron / 365.25,
    fuente,
    fueraDeRango,
  };
}

// ============================================================
// 2. TABLAS DE UMBRALES (editables por un clínico)
// ============================================================
/**
 * FC (lpm). "despierto" = reposo tranquilo. Inquieto +10, Llanto +20 sobre el límite superior.
 * Neonato: 100-160 [LIBRO:NEO], transición hasta 180 [LIBRO:WONG].
 * Lactante / LactanteMayor: [REF] PALS. critBaja/critAlta: [PROPUESTA].
 */
const FC: Record<Grupo, { dormido: [number, number]; despierto: [number, number]; critBaja: number; critAlta: number }> = {
  Neonato:       { dormido: [90, 160], despierto: [100, 160], critBaja: 80, critAlta: 200 }, // ≤80 crítico: código original
  Lactante:      { dormido: [90, 160], despierto: [100, 160], critBaja: 60, critAlta: 220 },
  LactanteMayor: { dormido: [80, 120], despierto: [98, 140],  critBaja: 60, critAlta: 200 },
};

/**
 * FR (rpm). Requiere FR MEDIDA.
 * Neonato: 30-60 y 30-55 en reposo sano [LIBRO:WONG]; >60 taquipnea [LIBRO:WONG]; llanto >80 (código original).
 * Lactante >=50 / LactanteMayor >=40: "respiración rápida" OMS [REF]. El resto [PROPUESTA].
 */
const FR: Record<Grupo, { min: number; supReposo: number; critReposo: number; supActivo: number }> = {
  Neonato:       { min: 30, supReposo: 55, critReposo: 60, supActivo: 80 },
  Lactante:      { min: 30, supReposo: 50, critReposo: 65, supActivo: 70 },
  LactanteMayor: { min: 22, supReposo: 40, critReposo: 55, supActivo: 55 },
};
const APNEA_SEG = 20;        // pausa >=20 s [LIBRO:WONG][LIBRO:LIPP]
const PAUSA_CON_BRADI_SEG = 10; // [PROPUESTA]

/** Persistencia: alerta no inmediata se confirma con >=MIN de las últimas VENTANA lecturas. [PROPUESTA] */
const VENTANA = 5;
const MIN_PERSIST = 3;

// ============================================================
// 3. HELPERS
// ============================================================
const alerta = (
  reglaId: string,
  categoria: Categoria,
  tipo: string,
  nivel: Nivel,
  mensaje: string,
  extra: { inmediata?: boolean; evidencia?: AlertaExt['evidencia'] } = {}
): AlertaInterna => ({ reglaId, categoria, tipo, nivel, mensaje, ...extra } as AlertaInterna);

/**
 * Diferencia dormido / despierto / reposo sin confirmar / inquieto / llanto.
 * Prioridad: llanto e inquieto (lo dice el acelerómetro) > estadoSueno explícito > 'Sueño' > 'Reposo'.
 */
export function resolverEstado(l: Pick<LecturaSensorExt, 'actividad' | 'estadoSueno'>): EstadoResuelto {
  const act = l.actividad as string;
  if (act === 'Llanto') return 'llanto';
  if (act === 'Inquieto') return 'inquieto';
  if (l.estadoSueno === 'dormido') return 'dormido';
  if (l.estadoSueno === 'despierto') return 'despierto';
  if (act === 'Sueño') return 'dormido';
  return 'reposo';
}

type RangoFC = { dormido: [number, number]; despierto: [number, number] };
/** Límites [min, sup] de FC según estado. 'reposo' (sin confirmar) usa la envolvente para NO generar falsas alarmas. */
function limitesFC(r: RangoFC, estado: EstadoResuelto): [number, number] {
  switch (estado) {
    case 'dormido':   return [r.dormido[0], r.dormido[1]];
    case 'despierto': return [r.despierto[0], r.despierto[1]];
    case 'inquieto':  return [r.despierto[0], r.despierto[1] + 10];
    case 'llanto':    return [r.despierto[0], r.despierto[1] + 20];
    default:          return [Math.min(r.dormido[0], r.despierto[0]), Math.max(r.dormido[1], r.despierto[1])];
  }
}

const RANGO_NIVEL: Record<Nivel, number> = { Critico: 3, Advertencia: 2, Info: 1 };

/** Mensaje adicional por sexo/circuncisión para fiebre en < 24 meses [LIBRO:LIPP]. */
function notaOrina(p: PerfilSaludExt, edad: EdadCalculada): string {
  if (edad.diasCron > 730) return '';
  if (p.sexo === 'Masculino') {
    return p.circuncidado === false
      ? ' Los varones no circuncidados tienen mayor riesgo de infección urinaria: pregunta por un examen de orina.'
      : ' Pregunta al pediatra si conviene un examen de orina (infección urinaria es causa frecuente de fiebre).';
  }
  if (p.sexo === 'Femenino') {
    return ' En niñas menores de 24 meses la infección urinaria es una causa frecuente: pregunta por un examen de orina.';
  }
  return ' Pregunta al pediatra si conviene un examen de orina.';
}

// ============================================================
// 4. REGLAS POR SISTEMA (evalúan UNA lectura, sin estado)
// ============================================================
function evaluarFC(l: LecturaSensorExt, e: EdadCalculada, ajusteFiebre: number): AlertaInterna[] {
  const r = FC[e.grupo];
  const estado = resolverEstado(l);
  const [min, supBase] = limitesFC(r, estado);
  const sup = supBase + ajusteFiebre;

  const ev = { fc: l.fc, min, sup, grupo: e.grupo, estado };
  const out: AlertaInterna[] = [];

  if (l.fc < min) {
    const conHipoxia = l.spo2 > 0 && l.spo2 < 90;
    const critico = l.fc <= r.critBaja || conHipoxia;
    out.push(alerta('FC_BAJA', 'FC', 'Bradicardia', critico ? 'Critico' : 'Advertencia',
      `FC baja: ${l.fc} lpm (esperado ≥ ${min}).${conHipoxia ? ' Con SpO2 baja.' : ''} En bebés pequeños la bradicardia preocupa más que la taquicardia.`,
      { inmediata: l.fc <= r.critBaja, evidencia: ev }));
  } else if (l.fc > sup) {
    const critico = l.fc >= r.critAlta;
    out.push(alerta('FC_ALTA', 'FC', 'Taquicardia', critico ? 'Critico' : 'Advertencia',
      `FC alta: ${l.fc} lpm (esperado ≤ ${sup}${ajusteFiebre ? `, ajustado por fiebre +${ajusteFiebre}` : ''}).`,
      { inmediata: false, evidencia: ev }));
  }
  return out;
}

/** Duración de la pausa respiratoria: dato directo del parser o reconstruida con timestamps de lecturas fr=0 consecutivas. */
function duracionPausaSeg(l: LecturaSensorExt, historial: LecturaSensorExt[]): number {
  if (l.pausaRespiratoriaSeg !== undefined) return l.pausaRespiratoriaSeg;
  if (l.fr !== 0 || l.timestamp === undefined) return 0;
  let inicio = l.timestamp;
  for (let i = historial.length - 1; i >= 0; i--) {
    const h = historial[i];
    if (h.fr !== 0 || h.timestamp === undefined) break;
    inicio = h.timestamp;
  }
  return (l.timestamp - inicio) / 1000;
}

function evaluarFR(l: LecturaSensorExt, e: EdadCalculada, historial: LecturaSensorExt[]): AlertaInterna[] {
  // La FR estimada como bpm/4 NO es una medición: no se evalúa (hueco #1).
  if (l.frMedida !== true) return [];
  const out: AlertaInterna[] = [];
  const r = FR[e.grupo];
  const estado = resolverEstado(l);
  const activo = estado === 'llanto' || estado === 'inquieto';

  // --- Apnea: por DURACIÓN, no por lectura. Pausas <20 s son normales (respiración periódica) [LIBRO:WONG]
  const pausa = duracionPausaSeg(l, historial);
  const fcMin = limitesFC(FC[e.grupo], estado)[0];
  const bradi = l.fc > 0 && l.fc < fcMin;
  const hipox = l.spo2 > 0 && l.spo2 < 90;
  if (pausa >= APNEA_SEG) {
    out.push(alerta('APNEA', 'FR', 'Apnea', 'Critico',
      `Sin respiración detectada por ${Math.round(pausa)} s. Estimula suavemente al bebé; si no responde, llama al 911.`,
      { inmediata: true, evidencia: { pausaSeg: pausa } }));
    return out;
  }
  if (pausa >= PAUSA_CON_BRADI_SEG && (bradi || hipox)) {
    out.push(alerta('APNEA', 'FR', 'Apnea con repercusión', 'Critico',
      `Pausa respiratoria de ${Math.round(pausa)} s con ${bradi ? 'FC baja' : 'SpO2 baja'}. Estimula al bebé; si no responde, llama al 911.`,
      { inmediata: true, evidencia: { pausaSeg: pausa, fc: l.fc, spo2: l.spo2 } }));
    return out;
  }
  if (l.fr === 0) return out; // pausa corta sin repercusión = normal

  const spo2Baja = l.spo2 > 0 && l.spo2 < 92;
  const ev = { fr: l.fr, grupo: e.grupo, estado };

  if (activo) {
    if (l.fr > r.supActivo) {
      out.push(alerta('FR_ALTA', 'FR', 'Polipnea', 'Critico',
        `FR muy alta incluso con llanto/inquietud: ${l.fr} rpm.`, { evidencia: ev }));
    }
    return out;
  }
  if (l.fr > r.critReposo || (l.fr > r.supReposo && spo2Baja)) {
    out.push(alerta('FR_ALTA', 'FR', 'Taquipnea', 'Critico',
      `FR alta en reposo: ${l.fr} rpm${spo2Baja ? ' con SpO2 baja' : ''}. Posible dificultad respiratoria.`, { evidencia: ev }));
  } else if (l.fr > r.supReposo) {
    out.push(alerta('FR_ALTA', 'FR', 'Taquipnea leve', 'Advertencia',
      `FR alta en reposo: ${l.fr} rpm (esperado ≤ ${r.supReposo}). Observa si se le hunden las costillas o aletea la nariz.`, { evidencia: ev }));
  }
  const minFR = estado === 'dormido' || estado === 'reposo' ? r.min - 5 : r.min;
  if (l.fr > 0 && l.fr < minFR) {
    out.push(alerta('FR_BAJA', 'FR', 'Bradipnea', 'Advertencia',
      `Respiración lenta: ${l.fr} rpm (esperado ≥ ${minFR}).`, { evidencia: ev }));
  }
  return out;
}

function evaluarSpO2(l: LecturaSensorExt, p: PerfilSaludExt): AlertaInterna[] {
  const s = l.spo2;
  const estado = resolverEstado(l);
  const quieto = estado !== 'llanto' && estado !== 'inquieto';
  const out: AlertaInterna[] = [];

  if (p.esPrematuro && p.usaOxigenoSuplementario) {
    // Objetivo 85-90% para evitar retinopatía, SOLO con oxígeno suplementario [LIBRO:NEO]
    if (s > 90) out.push(alerta('SPO2_ALTA', 'SPO2', 'Riesgo de Hiperoxia', 'Advertencia', `SpO2 alto para prematuro con oxígeno: ${s}%.`, { evidencia: { spo2: s } }));
    else if (s < 85) out.push(alerta('SPO2_BAJA', 'SPO2', 'Hipoxemia', 'Critico', `SpO2 bajo para prematuro: ${s}%.`, { inmediata: true, evidencia: { spo2: s } }));
    return out;
  }

  if (p.spo2Basal !== undefined) {
    // Cardiopatía: se compara contra la basal indicada por el médico, no contra 92% genérico
    if (s < p.spo2Basal - 5 || s < 70) {
      out.push(alerta('SPO2_BAJA', 'SPO2', 'Hipoxemia', 'Critico', `SpO2 ${s}% muy por debajo de su basal (${p.spo2Basal}%).`, { inmediata: s < 70, evidencia: { spo2: s, basal: p.spo2Basal } }));
    } else if (s < p.spo2Basal - 3) {
      out.push(alerta('SPO2_BAJA', 'SPO2', 'Hipoxemia', 'Advertencia', `SpO2 ${s}% por debajo de su basal (${p.spo2Basal}%).`, { evidencia: { spo2: s, basal: p.spo2Basal } }));
    }
    return out;
  }

  if (s < 92) {
    // <92% en aire ambiente es patológico; <90% requiere evaluación inmediata [LIBRO:WONG/LIPP]
    const critico = s < 90 || quieto;
    const aviso = p.sospechaCardiopatia
      ? ' (Sospecha de cardiopatía: pide al médico una SpO2 basal para ajustar este umbral.)' : '';
    out.push(alerta('SPO2_BAJA', 'SPO2', 'Hipoxemia', critico ? 'Critico' : 'Advertencia',
      `SpO2 baja: ${s}%.${s < 90 ? ' Requiere evaluación inmediata.' : ''} Revisa que el sensor esté bien puesto.${aviso}`,
      { inmediata: s < 85, evidencia: { spo2: s, estado } }));
  }
  // SpO2 >98% es normal en un bebé sano: ya no se emite "Hiperoxia" (era ruido).
  return out;
}

function evaluarTemperatura(l: LecturaSensorExt, p: PerfilSaludExt, e: EdadCalculada): AlertaInterna[] {
  const t = l.temp;
  const estado = resolverEstado(l);
  const out: AlertaInterna[] = [];
  const sitioPiel = l.sitioTemperatura === 'piel';
  // Temperatura de piel suele leer más baja que la central: nunca Crítico por hipotermia solo con piel.
  const hipoNivel = (n: Nivel): Nivel => (sitioPiel && n === 'Critico' ? 'Advertencia' : n);
  const ev = { temp: t, sitio: l.sitioTemperatura ?? 'axilar', diasCron: e.diasCron };
  const nota = t >= 38 ? notaOrina(p, e) : '';

  const neonatoCorregido = e.grupo === 'Neonato';

  if (p.altoRiesgoSDR && neonatoCorregido) {
    // Objetivo 36.0-36.5 °C en RN de alto riesgo [código original]
    if (t < 36.0 || t > 36.5) {
      out.push(alerta('TEMP_SDR', 'TEMP', 'Fallo Térmico (SDR)', t >= 38 ? 'Critico' : 'Advertencia',
        `Temperatura fuera del rango de seguridad para SDR: ${t}°C.`, { evidencia: ev }));
    }
    return out;
  }

  if (p.esPrematuro && neonatoCorregido) {
    // Prematuro axilar 36.3-36.9 °C [LIBRO:WONG/NEO]
    if (t < 36.3) out.push(alerta('TEMP_BAJA', 'TEMP', 'Alerta Térmica Prematuro', hipoNivel('Critico'), `Temperatura baja para prematuro: ${t}°C.`, { evidencia: ev }));
    else if (t >= 38) out.push(alerta('TEMP_ALTA', 'TEMP', 'Fiebre en prematuro', 'Critico', `Fiebre en prematuro: ${t}°C.${nota}`, { inmediata: true, evidencia: ev }));
    else if (t > 36.9) out.push(alerta('TEMP_ALTA', 'TEMP', 'Alerta Térmica Prematuro', 'Advertencia', `Temperatura alta para prematuro: ${t}°C.`, { evidencia: ev }));
    return out;
  }

  // ---- Hipotermia
  if (e.diasCron <= 28) {
    // Axilar normal 36.3-37 °C [LIBRO:WONG]. Umbral crítico <36.0: [PROPUESTA] (NEO/OMS dan 36.5 → decisión clínica pendiente)
    if (t < 36.0) out.push(alerta('TEMP_BAJA', 'TEMP', 'Hipotermia', hipoNivel('Critico'), `Hipotermia neonatal: ${t}°C. Abriga al bebé y consulta de inmediato.`, { evidencia: ev }));
    else if (t < 36.3) out.push(alerta('TEMP_BAJA', 'TEMP', 'Temperatura baja', 'Advertencia', `Temperatura baja: ${t}°C (normal axilar 36.3-37.0). Revisa abrigo y ambiente.`, { evidencia: ev }));
  } else if (t < 35.5) {
    out.push(alerta('TEMP_BAJA', 'TEMP', 'Hipotermia', hipoNivel('Critico'), `Temperatura muy baja: ${t}°C.`, { evidencia: ev }));
  } else if (t < 36.5) {
    out.push(alerta('TEMP_BAJA', 'TEMP', 'Hipotermia', 'Advertencia', `Temperatura baja: ${t}°C.`, { evidencia: ev }));
  }

  // ---- Fiebre por edad CRONOLÓGICA [LIBRO:LIPP]
  if (t >= 38) {
    if (e.diasCron <= 28) {
      out.push(alerta('TEMP_ALTA', 'TEMP', 'Fiebre neonatal', 'Critico',
        `Temperatura de ${t}°C en un bebé de menos de 29 días. Requiere valoración médica URGENTE (acude a urgencias).${nota}`, { inmediata: true, evidencia: ev }));
    } else if (e.diasCron <= 90) {
      out.push(alerta('TEMP_ALTA', 'TEMP', 'Fiebre <3 meses', 'Critico',
        `Temperatura de ${t}°C en un bebé menor de 3 meses. Requiere valoración médica urgente.${nota}`, { inmediata: true, evidencia: ev })); // [PROPUESTA]/[REF]
    } else if (t >= 40) {
      out.push(alerta('TEMP_ALTA', 'TEMP', 'Fiebre alta', 'Critico',
        `Fiebre de ${t}°C. Con 40°C o más el riesgo de infección grave aumenta: acude a urgencias.${nota}`, { inmediata: true, evidencia: ev }));
    } else if (t >= 39) {
      out.push(alerta('TEMP_ALTA', 'TEMP', 'Fiebre alta', 'Advertencia',
        `Fiebre de ${t}°C. Vigila hidratación, ropa y actividad; si se ve decaído o hay convulsión, acude a urgencias.${nota}`, { evidencia: ev }));
    } else {
      out.push(alerta('TEMP_ALTA', 'TEMP', 'Fiebre', 'Advertencia',
        `Fiebre de ${t}°C. Vigila hidratación y actividad; consulta si dura más de 3 días.${nota}`, { evidencia: ev }));
    }
  } else if (t >= 37.5 && (estado === 'dormido' || e.diasCron <= 28)) {
    // Causa ambiental frecuente: habitación caliente / exceso de ropa [LIBRO:WONG]
    out.push(alerta('TEMP_AMBIENTE', 'TEMP', 'Posible sobrecalentamiento', 'Info',
      `Temperatura ${t}°C. Revisa que no tenga demasiada ropa/cobijas ni un cuarto muy caliente.`, { evidencia: ev }));
  }
  return out;
}

function evaluarPA(l: LecturaSensorExt, p: PerfilSaludExt, e: EdadCalculada): AlertaInterna[] {
  // El ESP32 no mide PA: esta sección solo corre si algún día llega pas/pam (o captura manual).
  const out: AlertaInterna[] = [];
  if (p.esPrematuro && e.diasCron <= 1 && l.pam && p.edadGestacionalSemanas) {
    if (l.pam < p.edadGestacionalSemanas) {
      out.push(alerta('PA_BAJA', 'PA', 'Hipotensión Neonatal', 'Critico', `PAM baja: ${l.pam} mmHg. Esperada ≈ ${p.edadGestacionalSemanas} mmHg.`, { inmediata: true }));
    }
    return out;
  }
  if (l.pas) {
    let pasMin = 0;
    const kg = p.pesoKg;
    if (kg) {
      // Límites por peso [LIBRO:LIPP]. Se cubre el hueco 2-3 kg con 50.
      if (kg < 3) pasMin = 50;
      else if (kg <= 10) pasMin = 60;
      else pasMin = 70 + 2 * Math.min(Math.floor(e.edadAnios), 10);
    } else {
      pasMin = e.grupo === 'Neonato' ? 50 : e.grupo === 'Lactante' ? 60 : 70;
    }
    if (l.pas < pasMin) {
      out.push(alerta('PA_BAJA', 'PA', 'Hipotensión', 'Critico', `PAS baja: ${l.pas} mmHg (límite inferior esperado: ${pasMin}).`, { inmediata: true }));
    }
  }
  return out;
}

function evaluarPostura(l: LecturaSensorExt, e: EdadCalculada): AlertaInterna[] {
  // Boca abajo durante el sueño en < 12 m [LIBRO:WONG]. No se promete prevenir el SMSL.
  if (l.posicion === 'boca_abajo' && resolverEstado(l) === 'dormido' && e.diasCron < 365 && (l.segundosEnPosicion ?? 0) >= 30) {
    return [alerta('POSTURA_PRONO', 'POSTURA', 'Boca abajo al dormir', 'Advertencia',
      'El bebé lleva más de 30 s boca abajo mientras duerme. Voltéalo boca arriba sobre una superficie firme.', { evidencia: { seg: l.segundosEnPosicion ?? 0 } })];
  }
  return [];
}

function evaluarConvulsion(l: LecturaSensorExt): AlertaInterna[] {
  if ((l.patronConvulsivoSeg ?? 0) >= 30) {
    const fiebre = l.temp >= 38 ? ' Con fiebre: posible convulsión febril.' : '';
    return [alerta('CONVULSION', 'NEURO', 'Posible convulsión', 'Critico',
      `Movimiento rítmico sostenido por ${l.patronConvulsivoSeg} s.${fiebre} Colócalo de lado, no le metas nada a la boca y llama al 911 si dura más de 5 min o no despierta.`,
      { inmediata: true })];
  }
  return [];
}

/** Evalúa UNA lectura sin estado. Devuelve TODAS las alertas (no solo una). */
function evaluarUna(l: LecturaSensorExt, p: PerfilSaludExt, e: EdadCalculada, historial: LecturaSensorExt[]): AlertaInterna[] {
  const out: AlertaInterna[] = [];

  // ---- Calidad de señal y plausibilidad
  const fcValida = l.fc >= 20 && l.fc <= 300;
  const spo2Valida = l.spo2 > 0 && l.spo2 <= 100;
  const tempValida = l.temp >= 30 && l.temp <= 43;
  const senalFiable = l.calidadSenal !== 'mala' && !l.movimientoFuerte;

  if (l.calidadSenal === 'mala') {
    out.push(alerta('SENAL_MALA', 'SENSOR', 'Señal poco fiable', 'Info', 'La señal del sensor es mala; revisa que esté bien colocado.'));
  }
  if (l.spo2 === 0 && l.fc > 0) {
    out.push(alerta('SENSOR_MAL', 'SENSOR', 'Sensor mal colocado', 'Advertencia', 'No se detecta oxígeno pero sí pulso: recoloca el sensor.'));
  }
  if (!tempValida) {
    out.push(alerta('TEMP_INVALIDA', 'SENSOR', 'Temperatura no válida', 'Info', `Lectura de temperatura fuera de rango fisiológico (${l.temp}°C). Revisa el contacto del sensor.`));
  }

  // ---- Fiebre → ajuste de FC esperada (10 lpm por °C) [LIBRO:código original]
  const ajusteFiebre = tempValida && l.temp > 37 ? Math.floor(l.temp - 37) * 10 : 0;

  if (senalFiable && fcValida) out.push(...evaluarFC(l, e, ajusteFiebre));
  out.push(...evaluarFR(l, e, historial)); // solo con FR medida
  if (senalFiable && spo2Valida) out.push(...evaluarSpO2(l, p));
  if (tempValida) out.push(...evaluarTemperatura(l, p, e));
  out.push(...evaluarPA(l, p, e));
  out.push(...evaluarPostura(l, e));
  out.push(...evaluarConvulsion(l));
  return out;
}

// ============================================================
// 5. FUNCIÓN PRINCIPAL
// ============================================================
export const evaluarLectura = (
  lectura: LecturaSensorExt,
  perfil: PerfilSaludExt,
  opciones: OpcionesEvaluacion = {}
): ResultadoEvaluacionExt => {
  const ahora = opciones.ahora ?? Date.now();
  const historial = opciones.historial;
  const edad = calcularEdad(perfil, ahora);

  const alertas: AlertaInterna[] = [];
  if (edad.fueraDeRango) {
    alertas.push(alerta('FUERA_ALCANCE', 'SENSOR', 'Edad fuera de alcance', 'Info',
      'La edad del perfil está fuera de 0-24 meses o la fecha de nacimiento es inválida; las reglas pueden no ser apropiadas.'));
  }

  // ---- Reglas + persistencia (N de M lecturas)
  let pendientes = 0;
  const crudas = evaluarUna(lectura, perfil, edad, historial ?? []);
  for (const a of crudas) {
    if (a.inmediata || a.nivel === 'Info' || !historial) {
      alertas.push(a); // sin historial: comportamiento sin estado (como la versión anterior)
      continue;
    }
    const previas = historial.slice(-(VENTANA - 1));
    let cuenta = 1;
    previas.forEach((h, i) => {
      // Cuenta solo si la MISMA regla ya estaba en un nivel igual o mayor (una Advertencia previa no confirma un Crítico)
      if (evaluarUna(h, perfil, edad, previas.slice(0, i)).some(
        x => x.reglaId === a.reglaId && RANGO_NIVEL[x.nivel as Nivel] >= RANGO_NIVEL[a.nivel as Nivel])) cuenta++;
    });
    if (previas.length >= MIN_PERSIST - 1 && cuenta >= MIN_PERSIST) {
      alertas.push({ ...a, evidencia: { ...(a.evidencia ?? {}), persistencia: `${cuenta}/${previas.length + 1}` } });
    } else {
      pendientes++;
    }
  }

  // ---- Puntaje compuesto: varios sistemas alterados a la vez [PROPUESTA]
  // (la taquicardia es el signo más sensible de choque y la hipotensión es tardía [LIBRO:LIPP/WONG])
  const peorPorCategoria = new Map<Categoria, Nivel>();
  for (const a of alertas) {
    if (!a.categoria || a.nivel === 'Info' || !['FC', 'FR', 'SPO2', 'TEMP'].includes(a.categoria)) continue;
    const previo = peorPorCategoria.get(a.categoria);
    if (!previo || RANGO_NIVEL[a.nivel as Nivel] > RANGO_NIVEL[previo]) peorPorCategoria.set(a.categoria, a.nivel as Nivel);
  }
  let puntaje = 0;
  peorPorCategoria.forEach(n => { puntaje += n === 'Critico' ? 3 : 2; });
  if (puntaje >= 6 && !alertas.some(a => a.nivel === 'Critico')) {
    alertas.push(alerta('COMPUESTO', 'COMPUESTO', 'Varios signos alterados', 'Critico',
      `Hay ${peorPorCategoria.size} signos vitales alterados al mismo tiempo (${Array.from(peorPorCategoria.keys()).join(', ')}). Busca valoración médica pronta.`,
      { evidencia: { puntaje } }));
  }

  // ---- Orden correcto: más grave primero (corrige el comparador inválido del sort anterior)
  alertas.sort((a, b) => RANGO_NIVEL[b.nivel as Nivel] - RANGO_NIVEL[a.nivel as Nivel]);

  return {
    esAnomalia: alertas.some(a => a.nivel !== 'Info'),
    alertas: alertas.map(({ inmediata, ...resto }) => resto),
    puntaje,
    edad,
    estado: resolverEstado(lectura),
    pendientesPersistencia: pendientes,
  };
};

// ============================================================
// 6. CRECIMIENTO: peso, talla y SEXO
// ============================================================
export interface MedicionCrecimiento {
  fecha: number;          // epoch ms
  pesoKg: number;
  longitudCm?: number;
}
export interface FilaLMS { mes: number; L: number; M: number; S: number }
export interface TablasLMS {
  Femenino?: { pesoEdad?: FilaLMS[] };
  Masculino?: { pesoEdad?: FilaLMS[] };
}
export interface OpcionesCrecimiento {
  ahora?: number;
  /**
   * Tablas LMS oficiales OMS 0-24 m, separadas por sexo (peso-para-edad). NO se incluyen valores
   * aquí a propósito: impórtalos desde la fuente oficial. Sin tablas no se calcula Z-score.
   */
  tablas?: TablasLMS;
}

/** Z = ((x/M)^L − 1)/(L·S) ; si L=0, Z = ln(x/M)/S  [REF: OMS] */
export function zScoreLMS(valor: number, fila: FilaLMS): number {
  const { L, M, S } = fila;
  return L === 0 ? Math.log(valor / M) / S : (Math.pow(valor / M, L) - 1) / (L * S);
}

function interpolarLMS(tabla: FilaLMS[], mes: number): FilaLMS | undefined {
  if (!tabla.length) return undefined;
  const t = [...tabla].sort((a, b) => a.mes - b.mes);
  if (mes <= t[0].mes) return t[0];
  if (mes >= t[t.length - 1].mes) return t[t.length - 1];
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i], b = t[i + 1];
    if (mes >= a.mes && mes <= b.mes) {
      const f = (mes - a.mes) / (b.mes - a.mes);
      return { mes, L: a.L + f * (b.L - a.L), M: a.M + f * (b.M - a.M), S: a.S + f * (b.S - a.S) };
    }
  }
  return undefined;
}

// Ganancia semanal mínima esperada (g/sem): 0-6 m 140, 6-12 m 85 [LIBRO:WONG].
// Como las curvas OMS muestran velocidades menores después de ~3 m, quedarse "bajo" es Info;
// Advertencia solo si es < 50% de lo esperado. Ajustar con el pediatra. [PROPUESTA]
const GANANCIA_SEM = { hasta6m: 140, hasta12m: 85 };

export function evaluarCrecimiento(
  perfil: PerfilSaludExt,
  mediciones: MedicionCrecimiento[],
  opciones: OpcionesCrecimiento = {}
): AlertaExt[] {
  const ahora = opciones.ahora ?? Date.now();
  const out: AlertaExt[] = [];
  const A = (id: string, tipo: string, nivel: Nivel, mensaje: string): AlertaExt =>
    ({ reglaId: id, categoria: 'CRECIMIENTO', tipo, nivel, mensaje } as AlertaExt);

  const validas = mediciones.filter(m => m.pesoKg > 0.4 && m.pesoKg < 20).sort((a, b) => a.fecha - b.fecha);
  if (validas.length !== mediciones.length) {
    out.push(A('PESO_INVALIDO', 'Dato de peso inválido', 'Info', 'Hay mediciones de peso fuera de un rango plausible para 0-24 meses; revísalas.'));
  }
  if (perfil.fechaNacimiento === undefined) {
    out.push(A('SIN_FECHA_NAC', 'Falta fecha de nacimiento', 'Info', 'Sin fecha de nacimiento no se puede evaluar el crecimiento.'));
    return out;
  }
  if (!validas.length) return out;

  const ultima = validas[validas.length - 1];
  const nacimiento = perfil.fechaNacimiento;
  const diasCron = (m: MedicionCrecimiento) => Math.floor((m.fecha - nacimiento) / MS_DIA);
  const dias = diasCron(ultima);
  const sem = perfil.edadGestacionalSemanas;
  const corregir = (d: number) => corregirDias(d, sem);
  const pesoNac = perfil.pesoNacimientoKg;

  // --- Recién nacido: pérdida y recuperación [LIBRO:WONG/PRIMER/LIPP]
  if (pesoNac) {
    const perdida = (pesoNac - ultima.pesoKg) / pesoNac;
    if (dias <= 7 && perdida > 0.10) {
      out.push(A('PERDIDA_EXCESIVA', 'Pérdida de peso excesiva', 'Advertencia',
        `Ha perdido ${(perdida * 100).toFixed(0)}% de su peso al nacer (lo normal es hasta ~10% en los primeros días). Consulta a tu pediatra.`));
    }
    // 2 semanas [LIBRO:PRIMER/LIPP]; prematuros: 21 d [PROPUESTA, validar con neonatólogo]
    const diasRecup = sem !== undefined && sem < 37 ? 21 : 14;
    if (dias >= diasRecup && ultima.pesoKg < pesoNac) {
      out.push(A('NO_RECUPERA', 'No recupera el peso al nacer', 'Advertencia',
        'A las 2 semanas la mayoría ya recuperó su peso al nacer y aún no lo alcanza. Comenta esto con tu pediatra.'));
    }
  }

  // --- Ganancia entre mediciones (>= 14 días de separación)
  const previa = [...validas].reverse().find(m => dias - diasCron(m) >= 14);
  if (previa && dias >= 15) {
    const dd = dias - diasCron(previa);
    const gSem = ((ultima.pesoKg - previa.pesoKg) * 1000) / (dd / 7);
    const meses = dias / 30.4375;
    if (gSem < 0) {
      out.push(A('PESO_BAJA', 'Pérdida de peso', 'Advertencia', `Su peso bajó ${Math.abs(Math.round(gSem))} g/semana en promedio. Consulta a tu pediatra.`));
    } else if (meses < 12) {
      const esperado = meses < 6 ? GANANCIA_SEM.hasta6m : GANANCIA_SEM.hasta12m;
      if (gSem < esperado * 0.5) {
        out.push(A('GANANCIA_BAJA', 'Aumento de peso insuficiente', 'Advertencia',
          `Gana ~${Math.round(gSem)} g/semana (referencia ≥ ${esperado}). Comenta esto en su próxima consulta.`));
      } else if (gSem < esperado) {
        out.push(A('GANANCIA_BAJA', 'Aumento de peso algo lento', 'Info',
          `Gana ~${Math.round(gSem)} g/semana (referencia ${esperado}). La tendencia importa más que un solo dato.`));
      }
    }
  }

  // --- Z-score por SEXO (peso-para-edad, edad corregida) [REF: OMS]
  const tablas = perfil.sexo ? opciones.tablas?.[perfil.sexo]?.pesoEdad : undefined;
  if (!perfil.sexo) {
    out.push(A('SIN_SEXO', 'Falta el sexo', 'Info', 'Sin el sexo del bebé no se puede comparar su peso con la curva OMS correcta.'));
  } else if (!tablas) {
    out.push(A('SIN_TABLAS', 'Z-score no disponible', 'Info', 'Aún no hay tablas OMS cargadas: se evalúa pérdida, recuperación y ganancia de peso, pero no la curva por sexo.'));
  } else {
    const zDe = (m: MedicionCrecimiento) => {
      const fila = interpolarLMS(tablas, corregir(diasCron(m)) / 30.4375);
      return fila ? zScoreLMS(m.pesoKg, fila) : undefined;
    };
    const z = zDe(ultima);
    if (z !== undefined) {
      if (z < -3) out.push(A('Z_MUY_BAJO', 'Peso muy bajo para su edad', 'Advertencia', `Su peso está muy por debajo de lo esperado para su edad y sexo (Z ${z.toFixed(1)}). Pide valoración médica pronto.`));
      else if (z < -2) out.push(A('Z_BAJO', 'Peso bajo para su edad', 'Advertencia', `Su peso está por debajo de lo esperado para su edad y sexo (Z ${z.toFixed(1)}). Coméntalo con tu pediatra.`));
      else if (z > 3) out.push(A('Z_ALTO', 'Peso muy alto para su edad', 'Info', `Su peso está muy por encima de lo esperado (Z ${z.toFixed(1)}). Coméntalo en su consulta.`));
      else if (z > 2) out.push(A('Z_ALTO', 'Peso alto para su edad', 'Info', `Su peso está por encima de lo esperado (Z ${z.toFixed(1)}).`));
      // Cruce de carriles: caída >= 1 DE entre dos mediciones [PROPUESTA]
      if (previa) {
        const zPrev = zDe(previa);
        if (zPrev !== undefined && zPrev - z >= 1) {
          out.push(A('CRUCE_PERCENTIL', 'Su curva de peso ha bajado', 'Advertencia', `Su peso pasó de Z ${zPrev.toFixed(1)} a Z ${z.toFixed(1)} respecto a la medición anterior. Coméntalo con tu pediatra.`));
        }
      }
    }
  }

  // --- Medición desactualizada
  const diasDesdeUltima = Math.floor((ahora - ultima.fecha) / MS_DIA);
  const limite = dias < 183 ? 28 : 56;
  if (diasDesdeUltima > limite) {
    out.push(A('PESO_DESACTUALIZADO', 'Peso desactualizado', 'Info', `Hace ${diasDesdeUltima} días que no registras el peso. Pésalo en su próxima consulta.`));
  }
  return out;
}
