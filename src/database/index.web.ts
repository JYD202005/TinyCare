import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";

import { models } from "./models";
import { babyMonitorSchema } from "./schema";
import migrations from "./migrations";

// Definimos el adaptador para la web
const adapter = new LokiJSAdapter({
  schema: babyMonitorSchema,
  migrations,
  useWebWorker: false, // Opcional, puede mejorar rendimiento en web
  useIncrementalIndexedDB: true, // Recomendado para evitar pérdida de datos
  dbName: "TinyCareDB",
  onSetUpError: error => {
    console.warn("Database setup error. Resetting database.", error);
  }
});

// Inicializamos la base de datos
export const database = new Database({
  adapter,
  modelClasses: models,
});

export default database;
