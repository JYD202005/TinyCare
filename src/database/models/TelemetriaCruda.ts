import { Model } from '@nozbe/watermelondb'
import { field, date, text, field as numField } from '@nozbe/watermelondb/decorators'

export default class TelemetriaCruda extends Model {
  static table = 'telemetria_cruda'

  @text('id_perfil') idPerfil!: string
  @numField('fc') fc!: number
  @numField('fr') fr!: number
  @numField('spo2') spo2!: number
  @numField('temp') temp!: number
  @numField('pas') pas?: number
  @numField('pam') pam?: number
  @text('actividad') actividad!: string
  @field('es_anomalia') esAnomalia!: boolean
  @date('timestamp_medicion') timestampMedicion!: number
  @field('is_synced') isSynced!: boolean
}
