/**
 * Generador estático de citas de seguimiento pediátrico basadas en el IMSS ("Niño Sano").
 * Al calcularse al vuelo, ahorramos espacio en la base de datos local y en la nube.
 */

export interface CitaIMSS {
  id_estatica: string;
  titulo: string;
  descripcion: string;
  diasDesdeNacimiento: number;
}

export const CITAS_IMSS_BASE: CitaIMSS[] = [
  { id_estatica: 'imss_7d', titulo: 'Primera Revisión', descripcion: 'Revisión con enfermera (Tamiz si falta, peso, ictericia).', diasDesdeNacimiento: 7 },
  { id_estatica: 'imss_28d', titulo: 'Cita de 28 días', descripcion: 'Cierre de etapa neonatal. Revisión con enfermera.', diasDesdeNacimiento: 28 },
  { id_estatica: 'imss_2m', titulo: 'Cita de 2 Meses', descripcion: 'Vacunas y revisión de reflejos motores.', diasDesdeNacimiento: 60 },
  { id_estatica: 'imss_4m', titulo: 'Cita de 4 Meses', descripcion: 'Control de crecimiento y vacunas.', diasDesdeNacimiento: 120 },
  { id_estatica: 'imss_6m', titulo: 'Cita de 6 Meses', descripcion: 'Consulta Médica y Enfermería. Inicio de alimentación complementaria.', diasDesdeNacimiento: 180 },
  { id_estatica: 'imss_8m', titulo: 'Cita de 8 Meses', descripcion: 'Revisión de gateo y desarrollo psicomotor.', diasDesdeNacimiento: 240 },
  { id_estatica: 'imss_10m', titulo: 'Cita de 10 Meses', descripcion: 'Control con enfermera.', diasDesdeNacimiento: 300 },
  { id_estatica: 'imss_12m', titulo: 'Cita de 1 Año', descripcion: 'Consulta Médica. Vacunas (SRP). Evaluación de marcha.', diasDesdeNacimiento: 365 },
  // ... se pueden agregar las de 1.5, 2, 3, 4 y 5 años según info_IMSS.md
];

/**
 * Retorna las citas estándar del IMSS con su fecha exacta calculada en base al nacimiento del bebé.
 */
export const obtenerCitasEstandar = (fechaNacimiento: Date | number) => {
  const fechaNac = new Date(fechaNacimiento);
  
  return CITAS_IMSS_BASE.map(cita => {
    const fechaCita = new Date(fechaNac);
    fechaCita.setDate(fechaNac.getDate() + cita.diasDesdeNacimiento);
    
    return {
      ...cita,
      fechaExacta: fechaCita,
      esPasada: fechaCita.getTime() < Date.now(),
    };
  });
};
