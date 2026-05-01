export type EstadoActividad = 'Reposo' | 'Sueño' | 'Inquieto' | 'Llanto';
export type GrupoEdad = 'Neonato' | 'Lactante' | 'Nino';

export interface PerfilSalud {
  id: string;
  grupoEdad: GrupoEdad;
  esPrematuro: boolean;
  altoRiesgoSDR: boolean; 
  pesoKg?: number; 
  edadAnios?: number; 
  // CAMPOS EXTRAÍDOS DEL PDF:
  diasDeVida?: number; // Vital para la presión arterial del primer día
  edadGestacionalSemanas?: number; // Necesario para la PA en prematuros
}

export interface LecturaSensor {
  fc: number;        
  fr: number;        
  spo2: number;      
  temp: number;      
  pas?: number; // Presión Arterial Sistólica
  pam?: number; // Presión Arterial Media (Agregado para el primer día del prematuro)
  actividad: EstadoActividad; 
}

export interface AlertaMedica {
  tipo: string;
  nivel: 'Info' | 'Advertencia' | 'Critico';
  mensaje: string;
}

export interface ResultadoEvaluacion {
  esAnomalia: boolean;
  alertas: AlertaMedica[];
}
