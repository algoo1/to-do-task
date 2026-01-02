// This file is deprecated. 
// The application now uses Supabase for storage.
// See services/supabase.ts and services/storage.ts.

export const initDB = () => {
    // No-op
};
export const runQuery = () => {
    // No-op
    console.warn("Attempted to run alasql query after Supabase migration.");
    return [];
};
