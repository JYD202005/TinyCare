import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../database';
import { supabase } from './client';

export async function performSync() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('No active session, skipping sync');
    return;
  }

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const lastPulledAtTs = lastPulledAt || 0;
        
        // PULL ALL TABLES
        const fetchTable = async (table: string, filterField: string = 'updated_at') => {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .gt(filterField, lastPulledAtTs);
            if (error) throw error;
            return data || [];
        };

        const [
            perfiles,
            datos,
            salud,
            cuidadores,
            emergencias,
            telemetria,
            alertas,
            dispositivos,
            citas
        ] = await Promise.all([
            fetchTable('perfiles'),
            fetchTable('datos_personales', 'id'), // No updated_at for some, use ID as fallback for new records
            fetchTable('salud_contexto', 'id'),
            fetchTable('cuidadores', 'id'),
            fetchTable('emergencias', 'id'),
            fetchTable('telemetria_cruda', 'timestamp_medicion'),
            fetchTable('alertas_medicas', 'timestamp_evento'),
            fetchTable('dispositivos', 'id'),
            fetchTable('citas_personalizadas', 'id')
        ]);

        return {
          changes: {
            perfiles: { created: perfiles, updated: [], deleted: [] },
            datos_personales: { created: datos, updated: [], deleted: [] },
            salud_contexto: { created: salud, updated: [], deleted: [] },
            cuidadores: { created: cuidadores, updated: [], deleted: [] },
            emergencias: { created: emergencias, updated: [], deleted: [] },
            telemetria_cruda: { created: telemetria, updated: [], deleted: [] },
            alertas_medicas: { created: alertas, updated: [], deleted: [] },
            dispositivos: { created: dispositivos, updated: [], deleted: [] },
            citas_personalizadas: { created: citas, updated: [], deleted: [] }
          },
          timestamp: Date.now()
        };
      },
      pushChanges: async ({ changes }) => {
        const c = changes as any;
        
        const payload = {
            perfiles: [...c.perfiles.created, ...c.perfiles.updated],
            datos_personales: [...c.datos_personales.created, ...c.datos_personales.updated],
            salud_contexto: [...c.salud_contexto.created, ...c.salud_contexto.updated],
            telemetria_cruda: c.telemetria_cruda.created, // No update for telemetry
            alertas_medicas: [...c.alertas_medicas.created, ...c.alertas_medicas.updated],
            dispositivos: [...c.dispositivos.created, ...c.dispositivos.updated],
            citas_personalizadas: [...c.citas_personalizadas.created, ...c.citas_personalizadas.updated]
        };

        // Check if there is anything to push
        const hasChanges = Object.values(payload).some(arr => arr.length > 0);
        
        if (hasChanges) {
          const { error } = await supabase.rpc('push_sync', { payload });
          if (error) throw new Error('Atomic Push Failed: ' + error.message);
        }
      },
      migrationsEnabledAtVersion: 1,
    });
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Error during sync:', error);
  }
}
