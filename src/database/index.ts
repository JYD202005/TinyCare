import { Database } from '@nozbe/watermelondb'
import { NativeModules } from 'react-native'

import migrations from './migrations'
import { models } from './models'
import { babyMonitorSchema } from './schema'

// WMDatabaseBridge solo existe cuando el módulo nativo fue compilado
// (dev client via EAS, o producción). En Expo Go NO está disponible.
const isSQLiteAvailable = !!(NativeModules && NativeModules.WMDatabaseBridge)

function createAdapter() {
  if (isSQLiteAvailable) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default
    console.log('[DB] Using SQLiteAdapter (native)')
    return new SQLiteAdapter({
      schema: babyMonitorSchema,
      migrations,
      // JSI desactivado: incompatible con New Architecture (Fabric) en Hermes.
      jsi: false,
      onSetUpError: (error: any) => {
        console.error('[DB] SQLite setup error:', error)
      },
    })
  }

  // Fallback: LokiJS para Expo Go o cualquier entorno sin el módulo nativo.
  // Los datos NO se persisten entre reinicios, pero la app funciona completamente.
  console.warn('[DB] WMDatabaseBridge no disponible — usando LokiJS en memoria (Expo Go mode)')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default
  return new LokiJSAdapter({
    schema: babyMonitorSchema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  })
}

export const database = new Database({
  adapter: createAdapter(),
  modelClasses: models,
})

export default database
