import { Model } from '@nozbe/watermelondb'
import { date, text, field as numField } from '@nozbe/watermelondb/decorators'

export default class Emergencia extends Model {
  static table = 'emergencias'

  @text('id_perfil') idPerfil: string
  @text('nombre_contacto') nombreContacto: string
  @text('lada') lada?: string
  @numField('numero') numero: number
  @date('deleted_at') deletedAt?: number
}
