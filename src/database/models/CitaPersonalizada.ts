import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class CitaPersonalizada extends Model {
  static table = 'citas_personalizadas';

  @field('id_perfil') idPerfil!: string;
  @field('titulo') titulo!: string;
  @field('especialidad_medico') especialidadMedico?: string;
  @date('fecha_cita') fechaCita!: Date;
  @field('notas') notas?: string;
  
  @readonly @date('deleted_at') deletedAt?: Date;
}
