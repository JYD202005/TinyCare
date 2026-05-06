import { Model } from '@nozbe/watermelondb'
import { field, date, text, readonly, writer } from '@nozbe/watermelondb/decorators'

export default class AlertaMedica extends Model {
  static table = 'alertas_medicas'

  @text('id_perfil')         idPerfil!: string
  @text('tipo_alerta')       tipoAlerta!: string
  @text('nivel')             nivel!: string        // 'Info' | 'Advertencia' | 'Critico'
  @text('valor_registrado')  valorRegistrado!: string
  @text('mensaje_medico')    mensajeMedico!: string
  @date('timestamp_evento')  timestampEvento!: number
  @field('leida')            leida!: boolean
  @field('is_synced')        isSynced!: boolean

  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  /** Marca la alerta como leída y la sincroniza */
  @writer async marcarLeida() {
    await this.update((a) => {
      a.leida = true
    })
  }
}
