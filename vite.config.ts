import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://inayblurpqztvwusugxd.supabase.co';
  
  // Prioritize JWT token key from env.SUPABASE_ANON_KEY or process.env.SUPABASE_ANON_KEY
  const jwtKey = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const anonKey = jwtKey || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluYXlibHVycHF6dHZ3dXN1Z3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDczMTgsImV4cCI6MjA5OTUyMzMxOH0.uBwtX9AZljLq-WkGdDcID8BMzrP1Jwe1vCgzEH7UA_4';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(anonKey),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anonKey)
    }
  };
});


