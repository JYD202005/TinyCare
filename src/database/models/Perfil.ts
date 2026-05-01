import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators'

export default class Perfil extends Model {
  static table = 'perfiles'

  @text('id_usuario_remote') idUsuarioRemote!: string
  @text('nombre_identificador') nombreIdentificador!: string
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
  @date('deleted_at') deletedAt?: number
}
