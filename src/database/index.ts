import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { babyMonitorSchema } from './schema'
import { models } from './models'

// Definimos el adaptador para entorno nativo (iOS/Android)
const adapter = new SQLiteAdapter({
  schema: babyMonitorSchema,
  // JSI disabled: incompatible with New Architecture (Fabric) in Hermes —
  // causes "Cannot assign to read-only property 'NONE'" crash at startup.
  // Falls back to the async bridge, which is stable on all platforms.
  jsi: false,
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
