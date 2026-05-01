import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";

import { models } from "./models";
import { babyMonitorSchema } from "./schema";

// Definimos el adaptador para la web
const adapter = new LokiJSAdapter({
  schema: babyMonitorSchema,
  useWebWorker: false, // Opcional, puede mejorar rendimiento en web
  useIncrementalIndexedDB: true, // Recomendado para evitar pérdida de datos
  dbName: "TinyCareDB",
});

// Inicializamos la base de datos
export const database = new Database({
  adapter,
  modelClasses: models,
});

export default database;
