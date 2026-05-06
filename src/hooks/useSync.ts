import { useEffect, useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { performSync } from '../services/supabase/syncService';

export const useSync = () => {
  const { session } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!session) return;

    const sync = async () => {
      setIsSyncing(true);
      await performSync();
      setLastSync(new Date());
      setIsSyncing(false);
    };

    // Sync on mount
    sync();

    // Background sync interval (e.g. every 30 seconds to send data to remote caregivers)
    const interval = setInterval(sync, 30000);
    return () => clearInterval(interval);
  }, [session]);

  return { isSyncing, lastSync };
};
