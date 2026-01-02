import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// Project URL for 'wantchjxemmbynignrqx'
const SUPABASE_URL = 'https://wantchjxemmbynignrqx.supabase.co';

// Helper to get environment variables in various environments (Vite, Next.js, Create React App, Node)
const getEnvVar = (key: string, viteKey: string) => {
  // Check for Vite / Modern Browsers
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[viteKey] || import.meta.env[key];
  }
  // Check for Node / Webpack / standard process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[viteKey];
  }
  return '';
};

// ------------------------------------------------------------------
// API KEY INSTRUCTIONS
// ------------------------------------------------------------------
// Since you are deploying to Vercel (Vite), you must add the Environment Variable there.
// 1. Go to Vercel Dashboard -> Settings -> Environment Variables.
// 2. Add Key: VITE_SUPABASE_KEY
// 3. Add Value: [Your Supabase 'anon' / 'public' key]
//    (Find this in Supabase Dashboard -> Project Settings -> API)
// ------------------------------------------------------------------

const SUPABASE_KEY = getEnvVar('SUPABASE_KEY', 'VITE_SUPABASE_KEY');

if (!SUPABASE_KEY) {
  console.warn(
    "⚠️ Supabase API Key is missing. Please set VITE_SUPABASE_KEY in your environment variables."
  );
}

// Initialize Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'MISSING_KEY');