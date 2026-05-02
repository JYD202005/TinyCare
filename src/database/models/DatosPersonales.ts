import { Model } from '@nozbe/watermelondb'
import { field, date, text } from '@nozbe/watermelondb/decorators'

export default class DatosPersonales extends Model {
  static table = 'datos_personales'

  @text('id_perfil') idPerfil: string
  @text('primer_nombre') primerNombre: string
  @text('segundo_nombre') segundoNombre?: string
  @text('apellido_paterno') apellidoPaterno: string
  @text('apellido_materno') apellidoMaterno?: string
  @text('sexo') sexo: string
  @date('fecha_nacimiento') fechaNacimiento: number
  @date('deleted_at') deletedAt?: number
}
