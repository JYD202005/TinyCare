import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://tjzhtympyevpcwuowbnk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqemh0eW1weWV2cGN3dW93Ym5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTkzODYsImV4cCI6MjA5MzA5NTM4Nn0.3ayUMpBVAeEBAJio4WwIcepb3K_ErSCmBHU01uXghiY';

const isWebSSR = Platform.OS === 'web' && typeof window === 'undefined';

const dummyStorage = {
  getItem: (key: string) => Promise.resolve(null),
  setItem: (key: string, value: string) => Promise.resolve(),
  removeItem: (key: string) => Promise.resolve(),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWebSSR ? dummyStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
