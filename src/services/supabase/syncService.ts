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
        const lastPulledAtStr = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();
        
        // Example for perfiles. You need to do this for all tables.
        const { data: perfilesData, error: pErr } = await supabase
          .from('perfiles')
          .select('*')
          .gt('updated_at', lastPulledAtStr);

        const { data: telemetria, error: tErr } = await supabase
          .from('telemetria_cruda')
          .select('*')
          // Since telemetria doesn't update, we just pull new ones based on timestamp_medicion
          .gt('timestamp_medicion', lastPulledAt || 0);

        if (pErr || tErr) throw new Error('Error pulling changes');

        return {
          changes: {
            perfiles: {
              created: perfilesData || [],
              updated: [],
              deleted: []
            },
            telemetria_cruda: {
              created: telemetria || [],
              updated: [],
              deleted: []
            }
          },
          timestamp: Date.now()
        };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        const c = changes as any;
        const perfilesToPush = [...c.perfiles.created, ...c.perfiles.updated];
        let telemetriaToPush: any[] = [];

        // Check Premium Telemetry Access
        if (c.telemetria_cruda.created.length > 0) {
          const profileId = c.telemetria_cruda.created[0].id_perfil;
          const { data: canPush } = await supabase.rpc('can_push_telemetry', { p_id_perfil: profileId });
          
          if (canPush) {
            telemetriaToPush = c.telemetria_cruda.created.map((t: any) => ({
              id: t.id,
              id_perfil: t.id_perfil,
              fc: t.fc,
              fr: t.fr,
              spo2: t.spo2,
              temp: t.temp,
              actividad: t.actividad,
              timestamp_medicion: t.timestamp_medicion,
              es_anomalia: t.es_anomalia,
              is_synced: true
            }));
          } else {
            console.log('Skipping telemetry push: User is not Premium');
          }
        }

        // Atomic push via RPC
        if (perfilesToPush.length > 0 || telemetriaToPush.length > 0) {
          const { error } = await supabase.rpc('push_sync', {
            payload: {
              perfiles: perfilesToPush,
              telemetria_cruda: telemetriaToPush
            }
          });
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
