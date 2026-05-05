import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
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
