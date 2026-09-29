import AlertaMedica from './AlertaMedica'
import CitaPersonalizada from './CitaPersonalizada'
import Cuidador from './Cuidador'
import DatosPersonales from './DatosPersonales'
import Dispositivo from './Dispositivo'
import Emergencia from './Emergencia'
import MedicionCrecimiento from './MedicionCrecimiento'
import Perfil from './Perfil'
import SaludContexto from './SaludContexto'
import TelemetriaCruda from './TelemetriaCruda'
import TelemetriaResumen from './TelemetriaResumen'


export const models = [
  Perfil,
  DatosPersonales,
  SaludContexto,
  Cuidador,
  Emergencia,
  TelemetriaCruda,
  TelemetriaResumen,
  AlertaMedica,
  CitaPersonalizada,
  Dispositivo,
  MedicionCrecimiento,
]

export {
  AlertaMedica,
  CitaPersonalizada, Cuidador, DatosPersonales, Dispositivo, Emergencia, MedicionCrecimiento, Perfil, SaludContexto, TelemetriaCruda,
  TelemetriaResumen
}

