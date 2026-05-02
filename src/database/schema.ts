import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const babyMonitorSchema = appSchema({
  version: 1,
  tables: [
    // --- 1. ESTRUCTURA PRINCIPAL ---
    tableSchema({
      name: 'perfiles',
      columns: [
        { name: 'id_usuario_remote', type: 'string', isIndexed: true }, // ID de Supabase Auth
        { name: 'nombre_identificador', type: 'string' },
        { name: 'avatar', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true }, // Soft Delete
      ]
    }),

    tableSchema({
      name: 'datos_personales',
      columns: [
        { name: 'id_perfil', type: 'string', isIndexed: true },
        { name: 'primer_nombre', type: 'string' },
        { name: 'segundo_nombre', type: 'string', isOptional: true },
        { name: 'apellido_paterno', type: 'string' },
        { name: 'apellido_materno', type: 'string', isOptional: true },
        { name: 'sexo', type: 'string' }, // 'Femenino' | 'Masculino'
        { name: 'fecha_nacimiento', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ]
    }),

    tableSchema({
      name: 'salud_contexto',
      columns: [
        { name: 'id_perfil', type: 'string', isIndexed: true },
        { name: 'peso_kg', type: 'number', isOptional: true },
        { name: 'talla_cm', type: 'number', isOptional: true },
        { name: 'grupo_sanguineo', type: 'string', isOptional: true },
        { name: 'factor_rh', type: 'string', isOptional: true },
        // Factores Clínicos
        { name: 'grupo_edad', type: 'string' }, // 'Neonato' | 'Lactante' | 'Nino'
        { name: 'es_prematuro', type: 'boolean' },
        { name: 'alto_riesgo_sdr', type: 'boolean' },
        { name: 'sospecha_cardiopatia', type: 'boolean' },
        { name: 'dias_de_vida', type: 'number', isOptional: true },
        { name: 'edad_gestacional_semanas', type: 'number', isOptional: true },
        // Detalles de salud extra
        { name: 'tiene_alergias', type: 'boolean', isOptional: true },
        { name: 'detalles_alergias', type: 'string', isOptional: true },
        { name: 'tiene_complicaciones', type: 'boolean', isOptional: true },
        { name: 'detalles_complicaciones', type: 'string', isOptional: true },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ]
    }),

    // --- 2. CONTACTOS Y EMERGENCIAS ---
    tableSchema({
      name: 'cuidadores',
      columns: [
        { name: 'id_perfil', type: 'string', isIndexed: true },
        { name: 'primer_nombre', type: 'string' },
        { name: 'apellido_paterno', type: 'string' },
        { name: 'lada', type: 'string', isOptional: true },
        { name: 'numero', type: 'number' },
        { name: 'rol', type: 'string' }, // 'Madre' | 'Padre' | etc.
        { name: 'deleted_at', type: 'number', isOptional: true },
      ]
    }),

    tableSchema({
      name: 'emergencias',
      columns: [
        { name: 'id_perfil', type: 'string', isIndexed: true },
        { name: 'nombre_contacto', type: 'string' },
        { name: 'lada', type: 'string', isOptional: true },
        { name: 'numero', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ]
    }),

    // --- 3. TELEMETRÍA (Monitoreo de Flujo Continuo) ---
    tableSchema({
      name: 'telemetria_cruda',
      columns: [
        { name: 'id_perfil', type: 'string', isIndexed: true },
        { name: 'fc', type: 'number' },
        { name: 'fr', type: 'number' },
        { name: 'spo2', type: 'number' },
        { name: 'temp', type: 'number' },
        { name: 'pas', type: 'number', isOptional: true },
        { name: 'pam', type: 'number', isOptional: true },
        { name: 'actividad', type: 'string' }, // Estado al momento de la lectura
        { name: 'es_anomalia', type: 'boolean' },
        { name: 'timestamp_medicion', type: 'number', isIndexed: true },
        { name: 'is_synced', type: 'boolean' }, // Clave para purgar del celular
      ]
    }),

    tableSchema({
      name: 'telemetria_resumen',
      columns: [
        { name: 'id_perfil', type: 'string', isIndexed: true },
        { name: 'fc_avg', type: 'number' },
        { name: 'fr_avg', type: 'number' },
        { name: 'spo2_avg', type: 'number' },
        { name: 'temp_avg', type: 'number' },
        { name: 'intervalo_inicio', type: 'number', isIndexed: true },
        { name: 'is_synced', type: 'boolean' },
      ]
    }),

    // --- 4. ALERTAS MÉDICAS ---
    tableSchema({
      name: 'alertas_medicas',
      columns: [
        { name: 'id_perfil', type: 'string', isIndexed: true },
        { name: 'tipo_alerta', type: 'string' }, // Ej: 'Taquicardia Neonatal'
        { name: 'nivel', type: 'string' }, // 'Info' | 'Advertencia' | 'Critico'
        { name: 'valor_registrado', type: 'string' },
        { name: 'mensaje_medico', type: 'string' },
        { name: 'timestamp_evento', type: 'number', isIndexed: true },
        { name: 'leida', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' }, // Para limpiar alertas viejas
      ]
    }),
    // --- 5. AGENDA (Sólo citas creadas manualmente, las del IMSS se calculan al vuelo) ---
    tableSchema({
      name: 'citas_personalizadas',
      columns: [
        { name: 'id_perfil', type: 'string', isIndexed: true },
        { name: 'titulo', type: 'string' },
        { name: 'especialidad_medico', type: 'string', isOptional: true },
        { name: 'fecha_cita', type: 'number', isIndexed: true },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ]
    }),
  ]
})
