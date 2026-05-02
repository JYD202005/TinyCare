import { PerfilSalud, LecturaSensor, ResultadoEvaluacion, AlertaMedica } from '../types/medical';

/**
 * Algoritmo Clínico Exhaustivo para la evaluación de signos vitales en bebés.
 * Basado en guías médicas para neonatos, lactantes y niños.
 */
export const evaluarLectura = (
  lectura: LecturaSensor, 
  perfil: PerfilSalud
): ResultadoEvaluacion => {
  let esAnomalia = false;
  const alertas: AlertaMedica[] = [];

  // --- REGLA BASE: Ajuste por Fiebre ---
  // En un niño con fiebre, el pulso se eleva entre 10 y 15 latidos por cada grado centígrado.
  const gradosFiebre = lectura.temp > 37 ? Math.floor(lectura.temp - 37) : 0;
  const ajusteFiebreFC = gradosFiebre * 10; 

  // ==========================================
  // 1. FRECUENCIA CARDÍACA (FC)
  // ==========================================
  if (perfil.grupoEdad === 'Neonato') {
    // Bradicardia Neonatal
    if (lectura.fc < 100) {
      esAnomalia = true;
      // Cifras de 80 a 100 pulsaciones/min se presentan en anoxia y cardiopatías.
      const nivel = lectura.fc <= 80 ? 'Critico' : 'Advertencia'; 
      alertas.push({ tipo: 'Bradicardia', nivel, mensaje: `FC baja: ${lectura.fc} lpm. Cifras <= 100 requieren estudio.` });
    } 
    // Taquicardia Neonatal
    else if (lectura.fc > 150 && (lectura.actividad === 'Reposo' || lectura.actividad === 'Sueño')) {
      esAnomalia = true;
      const msg = lectura.fc >= 200 ? 'Riesgo inminente de cardiopatía (>200 lpm)' : 'Taquicardia en reposo (posible cardiopatía)';
      const nivel = lectura.fc >= 200 ? 'Critico' : 'Advertencia';
      alertas.push({ tipo: 'Taquicardia en reposo', nivel, mensaje: `${msg}: ${lectura.fc} lpm.` });
    }
    else if (lectura.fc > 160) {
      if (lectura.actividad === 'Llanto' && lectura.fc <= 180) {
         // Es un aumento fisiológico normal, se omite alerta.
      } else {
        esAnomalia = true;
        const msg = lectura.fc >= 200 ? 'Riesgo inminente de cardiopatía (>200 lpm)' : 'Taquicardia neonatal';
        const nivel = lectura.fc >= 200 ? 'Critico' : 'Advertencia';
        alertas.push({ tipo: 'Taquicardia', nivel, mensaje: `${msg}: ${lectura.fc} lpm.` });
      }
    }
  } 
  else if (perfil.grupoEdad === 'Lactante') {
    // Taquicardia sinusal es mayor a 160 lpm.
    if (lectura.fc > (160 + ajusteFiebreFC)) {
      esAnomalia = true;
      alertas.push({ tipo: 'Taquicardia Lactante', nivel: 'Advertencia', mensaje: `FC alta: ${lectura.fc} lpm.` });
    }
  } 
  else if (perfil.grupoEdad === 'Nino') {
    // Taquicardia sinusal es mayor a 140 lpm.
    if (lectura.fc > (140 + ajusteFiebreFC)) {
      esAnomalia = true;
      alertas.push({ tipo: 'Taquicardia Infantil', nivel: 'Advertencia', mensaje: `FC alta: ${lectura.fc} lpm.` });
    }
  }

  // ==========================================
  // 2. FRECUENCIA RESPIRATORIA (FR)
  // ==========================================
  if (lectura.fr === 0) {
    esAnomalia = true;
    alertas.push({ tipo: 'Apnea', nivel: 'Critico', mensaje: 'Suspensión transitoria de la respiración (0 rpm).' });
  } else if (perfil.grupoEdad === 'Neonato') {
    if (lectura.fr < 40) {
      esAnomalia = true;
      alertas.push({ tipo: 'Bradipnea', nivel: 'Advertencia', mensaje: `Respiración lenta: ${lectura.fr} rpm.` });
    } else if (lectura.fr > 50 && lectura.fr <= 60 && (lectura.actividad === 'Reposo' || lectura.actividad === 'Sueño')) {
      esAnomalia = true;
      alertas.push({ tipo: 'Taquipnea Leve', nivel: 'Advertencia', mensaje: `FR alta en reposo: ${lectura.fr} rpm. Posible presión venosa pulmonar elevada.` });
    } else if (lectura.fr > 60) {
      if (lectura.actividad !== 'Llanto' && lectura.actividad !== 'Inquieto') {
        esAnomalia = true;
        alertas.push({ tipo: 'Taquipnea', nivel: 'Critico', mensaje: `FR patológica en reposo: ${lectura.fr} rpm. Riesgo de SDR severo.` });
      } else if (lectura.fr > 80) {
        esAnomalia = true;
        alertas.push({ tipo: 'Polipnea Extrema', nivel: 'Critico', mensaje: `FR peligrosamente alta: ${lectura.fr} rpm.` });
      }
    }
  } else {
    // Para lactantes y niños, el aumento es signo común de enfermedad, pero no da un límite estático general debido a la variabilidad.
    if (lectura.fr > 60 && lectura.actividad === 'Reposo') {
        esAnomalia = true;
        alertas.push({ tipo: 'Polipnea/Taquipnea', nivel: 'Advertencia', mensaje: `Aumento de FR en reposo: ${lectura.fr} rpm. Signo de enfermedad.` });
    }
  }

  // ==========================================
  // 3. OXIGENACIÓN (SpO2)
  // ==========================================
  if (perfil.esPrematuro) {
    // Para evitar la retinopatía de la prematuridad, mantener SpO2 entre 85 y 90%.
    if (lectura.spo2 > 90) {
      esAnomalia = true;
      alertas.push({ tipo: 'Riesgo de Hiperoxia', nivel: 'Advertencia', mensaje: `SpO2 alto para prematuro: ${lectura.spo2}%.` });
    } else if (lectura.spo2 < 85) {
      esAnomalia = true;
      alertas.push({ tipo: 'Hipoxemia', nivel: 'Critico', mensaje: `SpO2 bajo para prematuro: ${lectura.spo2}%.` });
    }
  } else {
    // Una saturación menor que 92% respirando aire ambiente se considera patológica.
    if (lectura.spo2 < 92) {
      // El llanto o el esfuerzo pueden causar cianosis transitoria.
      // Saturación por debajo de 90% requiere evaluación médica inmediata según guías.
      const nivel = (lectura.spo2 < 90 || lectura.actividad === 'Reposo') ? 'Critico' : 'Advertencia'; 
      esAnomalia = true;
      const msg = lectura.spo2 < 90 ? 'Requiere evaluación inmediata.' : '';
      alertas.push({ tipo: 'Hipoxemia', nivel, mensaje: `SpO2 patológico: ${lectura.spo2}%. ${msg}`.trim() });
    } else if (lectura.spo2 > 98) {
       // Superior a 98% es hiperoxia.
       alertas.push({ tipo: 'Hiperoxia', nivel: 'Info', mensaje: `SpO2 superior a 98%: ${lectura.spo2}%.` });
    }
  }

  // ==========================================
  // 4. TEMPERATURA
  // ==========================================
  if (perfil.altoRiesgoSDR) {
    // En recién nacidos de alto riesgo buscar mantener entre 36 y 36.5 °C.
    if (lectura.temp < 36.0 || lectura.temp > 36.5) {
      esAnomalia = true;
      alertas.push({ tipo: 'Fallo Térmico (SDR)', nivel: 'Advertencia', mensaje: `Temperatura fuera de rango de seguridad SDR: ${lectura.temp}°C.` });
    }
  } else if (perfil.esPrematuro && perfil.grupoEdad === 'Neonato') {
    // RN Prematuro: Objetivo axilar 36.3 - 36.9 °C.
    if (lectura.temp < 36.3 || lectura.temp > 36.9) {
      esAnomalia = true;
      const nivel = lectura.temp < 36.3 ? 'Critico' : 'Advertencia';
      alertas.push({ tipo: 'Alerta Térmica Prematuro', nivel, mensaje: `Temp. fuera de objetivo: ${lectura.temp}°C.` });
    }
  } else {
    if (perfil.grupoEdad === 'Neonato') {
      // Neonato normal axilar: 36.5 a 36.8 °C.
      if (lectura.temp < 36.5) {
        esAnomalia = true;
        alertas.push({ tipo: 'Hipotermia', nivel: 'Critico', mensaje: `Hipotermia neonatal: ${lectura.temp}°C. Riesgo de estrés por frío y apnea.` });
      } else if (lectura.temp >= 38.0) {
        esAnomalia = true;
        alertas.push({ tipo: 'Hipertermia', nivel: 'Critico', mensaje: `Elevación térmica persistente (Fiebre): ${lectura.temp}°C.` });
      }
    } else {
      // Niño General: Temperatura "normal" definida como 37 °C. 
      // Hipotermia < 36.5 °C, Fiebre >= 38.0 °C.
      if (lectura.temp < 36.5) {
        esAnomalia = true;
        alertas.push({ tipo: 'Hipotermia', nivel: 'Advertencia', mensaje: `Temperatura baja: ${lectura.temp}°C.` });
      } else if (lectura.temp >= 38.0) {
        esAnomalia = true;
        alertas.push({ tipo: 'Fiebre', nivel: 'Critico', mensaje: `Fiebre detectada: ${lectura.temp}°C.` });
      }
    }
  }

  // ==========================================
  // 5. PRESIÓN ARTERIAL (PA)
  // ==========================================
  if (perfil.esPrematuro && perfil.diasDeVida !== undefined && perfil.diasDeVida <= 1 && lectura.pam && perfil.edadGestacionalSemanas) {
      // La presión arterial media debe ser igual a la edad gestacional en el primer día de vida.
      if (lectura.pam < perfil.edadGestacionalSemanas) {
          esAnomalia = true;
          alertas.push({ tipo: 'Hipotensión Neonatal', nivel: 'Critico', mensaje: `PAM baja: ${lectura.pam} mmHg. Esperada: ~${perfil.edadGestacionalSemanas} mmHg.`});
      }
  } else if (lectura.pas) {
    let pasMinima = 0;
    
    if (perfil.pesoKg) {
      if (perfil.pesoKg < 3) {
        pasMinima = 50; // Prematuros o muy bajo peso (< 3kg).
      } else if (perfil.pesoKg >= 3 && perfil.pesoKg <= 10) {
        pasMinima = 60; // Lactantes/Niños (3 a 10 kg).
      } else if (perfil.pesoKg > 10) {
        const factorEdad = (perfil.edadAnios !== undefined && perfil.edadAnios < 10) ? perfil.edadAnios : 10;
        pasMinima = 70 + (2 * factorEdad); 
      }
    } else {
      // Fallback si no hay peso registrado
      if (perfil.grupoEdad === 'Neonato') pasMinima = 50;
      else if (perfil.grupoEdad === 'Lactante') pasMinima = 60;
      else pasMinima = 70;
    }

    if (pasMinima > 0 && lectura.pas < pasMinima) {
      esAnomalia = true;
      alertas.push({ tipo: 'Hipotensión', nivel: 'Critico', mensaje: `PAS baja: ${lectura.pas} mmHg (Límite inferior esperado: ${pasMinima}).` });
    }
  }

  return { esAnomalia, alertas };
};
