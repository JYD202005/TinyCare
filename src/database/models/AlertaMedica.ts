import { Model } from '@nozbe/watermelondb'
import { field, date, text } from '@nozbe/watermelondb/decorators'

export default class AlertaMedica extends Model {
  static table = 'alertas_medicas'

  @text('id_perfil') idPerfil: string
  @text('tipo_alerta') tipoAlerta: string
  @text('nivel') nivel: string
  @text('valor_registrado') valorRegistrado: string
  @text('mensaje_medico') mensajeMedico: string
  @date('timestamp_evento') timestampEvento: number
  @field('leida') leida: boolean
  @field('is_synced') isSynced: boolean
}
