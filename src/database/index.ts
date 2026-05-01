import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import { Platform } from 'react-native'

import { babyMonitorSchema } from './schema'
import { models } from './models'

// Definimos el adaptador según la plataforma
let adapter

if (Platform.OS === 'web') {
  adapter = new LokiJSAdapter({
    schema: babyMonitorSchema,
    useWebWorker: false, // Opcional, puede mejorar rendimiento en web
    useIncrementalIndexedDB: true, // Recomendado para evitar pérdida de datos
    dbName: 'TinyCareDB', 
  })
} else {
  adapter = new SQLiteAdapter({
    schema: babyMonitorSchema,
    // dbName: 'TinyCareDB', // Opcional
    jsi: true, // Mejor rendimiento en Android/iOS
    onSetUpError: (error: any) => {
      console.error('Error al configurar la base de datos SQLite:', error)
    },
  })
}

// Inicializamos la base de datos
export const database = new Database({
  adapter,
  modelClasses: models,
})

export default database
