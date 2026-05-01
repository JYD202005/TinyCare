import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { babyMonitorSchema } from './schema'
import { models } from './models'

// Definimos el adaptador para entorno nativo (iOS/Android)
const adapter = new SQLiteAdapter({
  schema: babyMonitorSchema,
  // dbName: 'TinyCareDB', // Opcional
  jsi: true, // Mejor rendimiento en Android/iOS
  onSetUpError: (error: any) => {
    console.error('Error al configurar la base de datos SQLite:', error)
  },
})

// Inicializamos la base de datos
export const database = new Database({
  adapter,
  modelClasses: models,
})

export default database
