import { Model } from '@nozbe/watermelondb'
import { date, text, field as numField } from '@nozbe/watermelondb/decorators'

export default class Cuidador extends Model {
  static table = 'cuidadores'

  @text('id_perfil') idPerfil: string
  @text('primer_nombre') primerNombre: string
  @text('apellido_paterno') apellidoPaterno: string
  @text('lada') lada?: string
  @numField('numero') numero: number
  @text('rol') rol: string
  @date('deleted_at') deletedAt?: number
}
