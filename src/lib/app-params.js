// Replaced during Base44 → Supabase migration by staticbot.
// The base44 client (src/api/base44Client) is now backed by the Supabase-compatible shim.
// This module used to read VITE_BASE44_* env vars — those are no longer set. Any code that
// still imports `appParams` gets an inert object rather than silently-undefined fields.
export const appParams = {
  appId: null,
  token: null,
  functionsVersion: null,
  appBaseUrl: null,
  fromUrl: typeof window === 'undefined' ? null : window.location.href,
};
