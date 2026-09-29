import { Model } from '@nozbe/watermelondb'
import { date, text, field } from '@nozbe/watermelondb/decorators'

export default class MedicionCrecimiento extends Model {
  static table = 'mediciones_crecimiento'

  @text('id_perfil') idPerfil: string
  @date('fecha_medicion') fechaMedicion: number
  @field('peso_kg') pesoKg: number
  @field('longitud_cm') longitudCm?: number
  @text('fuente') fuente?: string
  @field('is_synced') isSynced: boolean
}
