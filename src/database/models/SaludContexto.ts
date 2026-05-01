import { Model } from '@nozbe/watermelondb'
import { field, date, text, field as numField } from '@nozbe/watermelondb/decorators'

export default class SaludContexto extends Model {
  static table = 'salud_contexto'

  @text('id_perfil') idPerfil!: string
  @numField('peso_kg') pesoKg?: number
  @numField('talla_cm') tallaCm?: number
  @text('grupo_sanguineo') grupoSanguineo?: string
  @text('factor_rh') factorRh?: string
  @text('grupo_edad') grupoEdad!: string
  @field('es_prematuro') esPrematuro!: boolean
  @field('alto_riesgo_sdr') altoRiesgoSdr!: boolean
  @field('sospecha_cardiopatia') sospechaCardiopatia!: boolean
  @numField('dias_de_vida') diasDeVida?: number
  @numField('edad_gestacional_semanas') edadGestacionalSemanas?: number
  @date('deleted_at') deletedAt?: number
}
