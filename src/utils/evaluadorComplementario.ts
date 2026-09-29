import {
  AlertaExt,
  EdadCalculada,
  EstadoResuelto,
  LecturaSensorExt,
  Nivel,
  resolverEstado,
} from './evaluadorMedico';

/**
 * Reglas que NO dependen de una sola lectura del sensor (CONTEXTO_CLINICO §7, §8.16, §6.5).
 * Todas son funciones puras: el llamador (MonitoringService / ConnectionManager / pantalla del
 * cuidador) les pasa los datos y guarda TODAS las alertas devueltas.
 * Umbrales [PROPUESTA] salvo donde se cite libro: requieren validación de un pediatra.
 */

const A = (
  reglaId: string,
  categoria: AlertaExt['categoria'],
  tipo: string,
  nivel: Nivel,
  mensaje: string,
  evidencia?: AlertaExt['evidencia']
): AlertaExt => ({ reglaId, categoria, tipo, nivel, mensaje, ...(evidencia ? { evidencia } : {}) } as AlertaExt);

// ============================================================
// 1. MONITOR SIN SEÑAL / BATERÍA  (§8.16)  — corre en ConnectionManager con un timer
// ============================================================
export const SIN_SENAL_ADVERTENCIA_MIN = 2; // solo si el bebé está dormido
export const SIN_SENAL_CRITICO_MIN = 5;

export interface EntradaSenal {
  /** epoch ms del último paquete BLE recibido */
  ultimoPaqueteMs: number;
  ahora?: number;
  /** Estado del bebé en la última lectura (usa resolverEstado). Si no se sabe, se asume 'reposo'. */
  estado?: EstadoResuelto;
  bateriaPct?: number;
}

export function evaluarSenalSensor(x: EntradaSenal): AlertaExt[] {
  const ahora = x.ahora ?? Date.now();
  const min = (ahora - x.ultimoPaqueteMs) / 60_000;
  const out: AlertaExt[] = [];
  const estado = x.estado ?? 'reposo';

  if (min > SIN_SENAL_CRITICO_MIN) {
    out.push(A('SIN_SENAL', 'SENSOR', 'Monitor sin señal', 'Critico',
      `El monitor perdió conexión hace ${Math.floor(min)} min. El bebé NO está siendo monitoreado.`, { minutos: Math.floor(min) }));
  } else if (min > SIN_SENAL_ADVERTENCIA_MIN && estado === 'dormido') {
    out.push(A('SIN_SENAL', 'SENSOR', 'Monitor sin señal', 'Advertencia',
      `No llegan datos del monitor desde hace ${Math.floor(min)} min. Revisa que el sensor esté puesto y encendido.`, { minutos: Math.floor(min) }));
  }

  if (x.bateriaPct !== undefined) {
    if (x.bateriaPct < 10) out.push(A('BATERIA', 'SENSOR', 'Batería muy baja', 'Advertencia', `Batería del sensor al ${x.bateriaPct}%. Cárgalo pronto.`, { bateria: x.bateriaPct }));
    else if (x.bateriaPct < 20) out.push(A('BATERIA', 'SENSOR', 'Batería baja', 'Info', `Batería del sensor al ${x.bateriaPct}%.`, { bateria: x.bateriaPct }));
  }
  return out;
}

// ============================================================
// 2. FIEBRE SOSTENIDA  (§8.4: fiebre >= 3 días seguidos)
// ============================================================
export interface DiaTemp {
  /** 'YYYY-MM-DD' en hora LOCAL del cuidador */
  dia: string;
  /** máxima temperatura VÁLIDA del día (descarta lecturas fuera de rango) */
  tempMax: number;
}
const diaIdx = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000);

export function evaluarFiebreSostenida(dias: DiaTemp[], umbral = 38, diasMin = 3): AlertaExt[] {
  const conFiebre = dias.filter(d => d.tempMax >= umbral).map(d => diaIdx(d.dia)).sort((a, b) => b - a);
  if (!conFiebre.length) return [];
  // racha de días consecutivos que termina en el día más reciente con fiebre
  let racha = 1;
  for (let i = 1; i < conFiebre.length; i++) {
    if (conFiebre[i - 1] - conFiebre[i] === 1) racha++;
    else break;
  }
  const ultimoDia = Math.max(...dias.map(d => diaIdx(d.dia)));
  if (racha >= diasMin && conFiebre[0] === ultimoDia) {
    return [A('FIEBRE_SOSTENIDA', 'TEMP', 'Fiebre por varios días', 'Advertencia',
      `Lleva ${racha} días seguidos con temperatura de ${umbral}°C o más. Consulta a tu pediatra.`, { dias: racha })];
  }
  return [];
}

// ============================================================
// 3. CUESTIONARIO DEL CUIDADOR  (§7, §8.10-8.13) — lo que el sensor no ve
// ============================================================
export interface ReporteCuidador {
  hidratacion?: { menosPanales?: boolean; vomitoDiarreaRepetidos?: boolean; fontanelaHundida?: boolean; sinLagrimas?: boolean; irritableLetargico?: boolean };
  respiracion?: { costillasHundidas?: boolean; aleteoNasal?: boolean; quejido?: boolean; muyRapida?: boolean; cianosis?: boolean };
  alimentacion?: { rechazaTomas?: boolean; vomitoProyectil?: boolean; vomitoVerde?: boolean };
  hecesConSangreOJalea?: boolean;
  estado?: { muyDormidoDificilDespertar?: boolean; irritableInconsolable?: boolean; flacido?: boolean };
  piel?: { ictericia?: boolean; petequias?: boolean };
  convulsion?: boolean;
  rigidezCuello?: boolean;
}

export interface ContextoReporte {
  /** Última lectura del sensor (para combinar con fiebre / SpO2). */
  lectura?: Pick<LecturaSensorExt, 'temp' | 'spo2'>;
  /** true si el evaluador viene marcando FC alta de forma persistente. */
  fcAltaPersistente?: boolean;
  edad?: EdadCalculada;
}

const cuenta = (o?: Record<string, boolean | undefined>) => (o ? Object.values(o).filter(Boolean).length : 0);

export function evaluarReporteCuidador(r: ReporteCuidador, ctx: ContextoReporte = {}): AlertaExt[] {
  const out: AlertaExt[] = [];
  const temp = ctx.lectura?.temp;
  const fiebre = temp !== undefined && temp >= 38;
  const spo2 = ctx.lectura?.spo2;

  // --- Fiebre + signos de alarma → Crítico [REF]
  const alarma = r.convulsion || r.rigidezCuello || r.piel?.petequias || r.estado?.muyDormidoDificilDespertar || r.estado?.flacido;
  if (fiebre && alarma) {
    out.push(A('FIEBRE_ALARMA', 'TEMP', 'Fiebre con signos de alarma', 'Critico',
      `Temperatura de ${temp}°C con signos de alarma (convulsión, rigidez de cuello, manchas que no palidecen, mucho sueño o flacidez). Acude a urgencias o llama al 911.`, { temp: temp! }));
  }
  if (r.convulsion && !fiebre) {
    out.push(A('CONVULSION_REPORTE', 'NEURO', 'Posible convulsión', 'Critico',
      'Reportas una posible convulsión. Colócalo de lado, no le metas nada a la boca y llama al 911 si dura más de 5 min o no despierta.'));
  }

  // --- Respiración
  const resp = r.respiracion;
  if (resp?.cianosis || (cuenta(resp) >= 1 && spo2 !== undefined && spo2 > 0 && spo2 < 90)) {
    out.push(A('RESP_GRAVE', 'FR', 'Posible dificultad respiratoria grave', 'Critico',
      'Color azulado/gris o esfuerzo al respirar con oxígeno bajo. Llama al 911.'));
  } else if (cuenta(resp) >= 1) {
    out.push(A('RESP_DIFICULTAD', 'FR', 'Posible dificultad para respirar', 'Advertencia',
      'Reportas señales de esfuerzo al respirar (costillas hundidas, aleteo nasal, quejido o respiración muy rápida). Acude a valoración médica pronta.'));
  }

  // --- Deshidratación: >= 2 señales
  const nHid = cuenta(r.hidratacion);
  if (nHid >= 2) {
    const grave = r.hidratacion?.irritableLetargico && ctx.fcAltaPersistente;
    out.push(A('DESHIDRATACION', 'COMPUESTO', 'Posible deshidratación', grave ? 'Critico' : 'Advertencia',
      `${fiebre ? `Con fiebre (${temp}°C) y ` : 'Con '}${nHid} señales de posible deshidratación. ${grave ? 'Con latidos rápidos y decaimiento: acude a urgencias.' : 'Ofrece líquidos y consulta a tu pediatra.'}`, { senales: nHid }));
  }

  // --- Digestivo / quirúrgico
  if (r.alimentacion?.vomitoVerde) {
    out.push(A('VOMITO_BILIAR', 'COMPUESTO', 'Vómito verde', 'Critico', 'El vómito verde en un bebé puede ser urgencia. Acude a urgencias.'));
  }
  if (r.alimentacion?.vomitoProyectil) {
    out.push(A('VOMITO_PROYECTIL', 'COMPUESTO', 'Vómito en proyectil', 'Advertencia', 'El vómito en proyectil después de cada toma requiere consulta pronta con el pediatra.'));
  }
  if (r.hecesConSangreOJalea) {
    out.push(A('HECES_SANGRE', 'COMPUESTO', 'Heces con sangre o moco', 'Critico',
      'Heces con sangre y moco, sobre todo con llanto por accesos, pueden indicar una urgencia. Acude a urgencias.'));
  }

  // --- Estado general
  if (r.estado?.flacido || r.estado?.muyDormidoDificilDespertar) {
    if (!fiebre) out.push(A('ESTADO_GRAVE', 'NEURO', 'Bebé muy decaído', 'Critico', 'Si está flácido o no despierta con facilidad, acude a urgencias o llama al 911.'));
  } else if (r.estado?.irritableInconsolable) {
    out.push(A('IRRITABLE', 'NEURO', 'Irritabilidad inconsolable', 'Advertencia', 'Si no logras consolarlo, consulta a tu pediatra.'));
  }

  // --- Piel
  if (r.piel?.petequias && !fiebre) {
    out.push(A('PETEQUIAS', 'COMPUESTO', 'Manchas que no palidecen', 'Critico', 'Manchas en la piel que no se borran al presionar requieren valoración urgente.'));
  }
  if (r.piel?.ictericia) {
    const rn = ctx.edad ? ctx.edad.diasCron <= 28 : true;
    out.push(A('ICTERICIA', 'COMPUESTO', 'Piel amarilla', 'Advertencia',
      rn ? 'Piel amarilla en un recién nacido: consulta a tu pediatra pronto para medir bilirrubina.' : 'Piel amarilla: consulta a tu pediatra.'));
  }

  // --- Alimentación: solo aviso
  if (r.alimentacion?.rechazaTomas && !nHid) {
    out.push(A('RECHAZA_TOMAS', 'COMPUESTO', 'Rechaza las tomas', 'Info', 'Si sigue rechazando las tomas, comenta con tu pediatra.'));
  }
  return out;
}

// ============================================================
// 4. LÍNEA BASE PERSONAL  (§6.5) — desvío contra el PROPIO bebé, solo en sueño
// ============================================================
export interface EntradaLineaBase {
  /** Lecturas de los últimos 7 días (cualquier estado; aquí se filtran las dormidas y válidas). */
  ultimos7dias: LecturaSensorExt[];
  /** Lecturas recientes, de la más antigua a la más reciente, incluyendo la actual como última. */
  recientes: LecturaSensorExt[];
}
export const LINEA_BASE_MIN_LECTURAS = 120; // ~2 h de sueño acumulado. [PROPUESTA]
export const LINEA_BASE_RACHA = 5;           // lecturas seguidas fuera de la base. [PROPUESTA]

const mediana = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const valida = (l: LecturaSensorExt) => l.calidadSenal !== 'mala' && !l.movimientoFuerte;

export function evaluarLineaBase(x: EntradaLineaBase): AlertaExt[] {
  const dormidas = x.ultimos7dias.filter(l => resolverEstado(l) === 'dormido' && valida(l));
  const fcBase = dormidas.filter(l => l.fc >= 20 && l.fc <= 300).map(l => l.fc);
  const spBase = dormidas.filter(l => l.spo2 > 0 && l.spo2 <= 100).map(l => l.spo2);
  const out: AlertaExt[] = [];
  const racha = x.recientes.slice(-LINEA_BASE_RACHA);
  if (racha.length < LINEA_BASE_RACHA || !racha.every(l => resolverEstado(l) === 'dormido' && valida(l))) return out;

  if (fcBase.length >= LINEA_BASE_MIN_LECTURAS) {
    const m = mediana(fcBase);
    if (racha.every(l => l.fc > m * 1.25)) {
      out.push(A('BASE_FC', 'FC', 'FC dormido por encima de lo habitual', 'Advertencia',
        `Su frecuencia cardíaca durmiendo (${racha[racha.length - 1].fc} lpm) está más de 25% por encima de lo habitual (${Math.round(m)} lpm). Si hay fiebre o decaimiento, consulta a tu pediatra.`,
        { basal: Math.round(m) }));
    }
  }
  if (spBase.length >= LINEA_BASE_MIN_LECTURAS) {
    const m = mediana(spBase);
    if (racha.every(l => l.spo2 > 0 && l.spo2 < m - 3)) {
      out.push(A('BASE_SPO2', 'SPO2', 'SpO2 dormido por debajo de lo habitual', 'Advertencia',
        `Su oxígeno durmiendo (${racha[racha.length - 1].spo2}%) está por debajo de lo habitual (${Math.round(m)}%). Revisa la colocación del sensor y su respiración.`,
        { basal: Math.round(m) }));
    }
  }
  return out;
}
