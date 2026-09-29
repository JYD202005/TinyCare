import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({ table: 'datos_personales', columns: [
          { name: 'circuncidado', type: 'boolean', isOptional: true },
        ] }),
        addColumns({ table: 'salud_contexto', columns: [
          { name: 'peso_nacimiento_kg', type: 'number', isOptional: true },
          { name: 'spo2_basal', type: 'number', isOptional: true },
          { name: 'usa_oxigeno_suplementario', type: 'boolean', isOptional: true },
        ] }),
        createTable({
          name: 'mediciones_crecimiento',
          columns: [
            { name: 'id_perfil', type: 'string', isIndexed: true },
            { name: 'fecha_medicion', type: 'number', isIndexed: true },
            { name: 'peso_kg', type: 'number' },
            { name: 'longitud_cm', type: 'number', isOptional: true },
            { name: 'fuente', type: 'string', isOptional: true }, // 'manual' | ...
            { name: 'is_synced', type: 'boolean' },
          ],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'dispositivos',
          columns: [
            { name: 'id_perfil', type: 'string', isIndexed: true },
            { name: 'identificador_hardware', type: 'string', isIndexed: true },
            { name: 'nombre', type: 'string' },
            { name: 'tipo_controlador', type: 'string' },
            { name: 'estado', type: 'string' },
            { name: 'sensores_config_json', type: 'string' },
            { name: 'ultima_conexion', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
})
