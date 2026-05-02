import { Model } from '@nozbe/watermelondb'
import { field, date, text, field as numField } from '@nozbe/watermelondb/decorators'

export default class TelemetriaResumen extends Model {
  static table = 'telemetria_resumen'

  @text('id_perfil') idPerfil: string
  @numField('fc_avg') fcAvg: number
  @numField('fr_avg') frAvg: number
  @numField('spo2_avg') spo2Avg: number
  @numField('temp_avg') tempAvg: number
  @date('intervalo_inicio') intervaloInicio: number
  @field('is_synced') isSynced: boolean
}
