import { useState, useEffect } from 'react';
import { database } from '../database';
import { TelemetriaCruda } from '../database/models';
import { Q } from '@nozbe/watermelondb';

export const useTelemetryStats = (perfilId: string | null) => {
  const [data24H, setData24H] = useState({
    spo2: [] as number[],
    temp: [] as number[],
    hr: [] as number[],
    posture: [] as number[],
    history: [] as any[]
  });
  
  const [data7D, setData7D] = useState({
    spo2: [] as number[],
    temp: [] as number[],
    hr: [] as number[],
    posture: [] as number[],
  });

  const [averages24H, setAverages24H] = useState({ spo2: 0, temp: 0, hr: 0, posture: 0 });
  const [alertsToday, setAlertsToday] = useState(0);

  useEffect(() => {
    if (!perfilId || perfilId === 'loading' || perfilId === 'empty') return;

    const fetchStats = async () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      try {
        const records7D = await database.collections.get<TelemetriaCruda>('telemetria_cruda')
          .query(
            Q.where('id_perfil', perfilId),
            Q.where('timestamp_medicion', Q.gte(sevenDaysAgo)),
            Q.sortBy('timestamp_medicion', Q.asc)
          ).fetch();

        const processRecords = (records: TelemetriaCruda[], points: number) => {
          if (records.length === 0) return { spo2: [], temp: [], hr: [], posture: [] };
          if (records.length <= points) {
            return {
              spo2: records.map(r => r.spo2),
              temp: records.map(r => r.temp),
              hr: records.map(r => r.fc),
              posture: records.map(r => 85) // Placeholder
            };
          }
          
          const chunkSize = Math.ceil(records.length / points);
          const aggregated = { spo2: [] as number[], temp: [] as number[], hr: [] as number[], posture: [] as number[] };
          for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            aggregated.spo2.push(chunk.reduce((sum, r) => sum + r.spo2, 0) / chunk.length);
            aggregated.temp.push(chunk.reduce((sum, r) => sum + r.temp, 0) / chunk.length);
            aggregated.hr.push(chunk.reduce((sum, r) => sum + r.fc, 0) / chunk.length);
            aggregated.posture.push(85);
          }
          return aggregated;
        };

        const records24H = records7D.filter(r => r.timestampMedicion >= oneDayAgo);
        
        const alerts = await database.collections.get('alertas_medicas')
          .query(
            Q.where('id_perfil', perfilId),
            Q.where('timestamp', Q.gte(oneDayAgo))
          ).fetch();
        setAlertsToday(alerts.length);

        const p24H = processRecords(records24H, 12);
        const p7D = processRecords(records7D, 7);

        let history = [] as any[];
        let avg24 = { spo2: 0, temp: 0, hr: 0, posture: 0 };

        if (records24H.length > 0) {
          history = records24H.slice(-3).reverse().map(r => {
            const diffMs = now - r.timestampMedicion;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            let timeStr = `Hace ${diffMins} min`;
            if (diffHours > 0) timeStr = `Hace ${diffHours} h`;
            
            return {
              time: timeStr,
              spo2: `${Math.round(r.spo2)}%`,
              temp: `${r.temp.toFixed(1)}°C`,
              hr: `${Math.round(r.fc)} LPM`,
              activity: r.actividad || 'Normal'
            };
          });

          avg24.spo2 = records24H.reduce((sum, r) => sum + r.spo2, 0) / records24H.length;
          avg24.temp = records24H.reduce((sum, r) => sum + r.temp, 0) / records24H.length;
          avg24.hr = records24H.reduce((sum, r) => sum + r.fc, 0) / records24H.length;
        } else {
          history = []
        }

        if (p24H) setData24H({ spo2: p24H.spo2.map(v=>+v.toFixed(1)), temp: p24H.temp.map(v=>+v.toFixed(1)), hr: p24H.hr.map(v=>Math.round(v)), posture: p24H.posture, history });
        if (p7D) setData7D({ spo2: p7D.spo2.map(v=>+v.toFixed(1)), temp: p7D.temp.map(v=>+v.toFixed(1)), hr: p7D.hr.map(v=>Math.round(v)), posture: p7D.posture });
        setAverages24H({ spo2: +avg24.spo2.toFixed(1), temp: +avg24.temp.toFixed(1), hr: Math.round(avg24.hr), posture: 0 });

      } catch (err) {
        console.warn('Error fetching telemetry stats', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [perfilId]);

  return { data24H, data7D, averages24H, alertsToday };
};
