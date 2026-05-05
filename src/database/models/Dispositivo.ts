import { Model } from '@nozbe/watermelondb'
import { field, text, date, readonly, writer } from '@nozbe/watermelondb/decorators'

export default class Dispositivo extends Model {
  static table = 'dispositivos'

  @text('id_perfil') idPerfil!: string
  @text('identificador_hardware') identificadorHardware!: string
  @text('nombre') nombre!: string
  @text('tipo_controlador') tipoControlador!: string
  @text('estado') estado!: string // 'activo', 'desconectado', 'error'
  @text('sensores_config_json') sensoresConfigJson!: string // JSON de sensores
  @date('ultima_conexion') ultimaConexion!: number
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  // Helpers para manejar el JSON de sensores
  get sensoresConfig() {
    try {
      return JSON.parse(this.sensoresConfigJson)
    } catch (e) {
      return []
    }
  }

  @writer async updateEstado(nuevoEstado: string) {
    await this.update(d => {
      d.estado = nuevoEstado
      d.ultimaConexion = Date.now()
    })
  }
}
