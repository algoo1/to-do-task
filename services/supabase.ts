import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// I have automatically set your Project URL based on the information you provided.
//
// YOU MUST ACTION THIS:
// 1. Go to your Supabase Dashboard for project 'wantchjxemmbynignrqx'.
// 2. Click on "Project Settings" (Gear icon on the left) -> "API".
// 3. Copy the 'anon' / 'public' Key (it looks like a long string starting with 'eyJ').
// 4. Paste it below inside the quotes for SUPABASE_KEY.
// ------------------------------------------------------------------

const SUPABASE_URL = 'https://wantchjxemmbynignrqx.supabase.co';

// ⚠️ PASTE YOUR 'ANON' KEY HERE
// Do NOT use the password 'MMMooo...'. That is for the database, not the API.
const SUPABASE_KEY = process.env.SUPABASE_KEY || ''; 

if (!SUPABASE_KEY) {
  console.error(
    "⚠️ Supabase API Key is missing! The app will load but cannot save data. Please update services/supabase.ts."
  );
}

// We provide a fallback 'MISSING_KEY' so the app doesn't crash on startup, 
// but requests will fail until you add the real key.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'MISSING_KEY');