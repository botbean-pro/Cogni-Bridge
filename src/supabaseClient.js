import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Each browser tab keeps its own sign-in, so a student, a mentor and a parent can be open side by side.
// sessionStorage is per tab, and a per-tab storage key stops supabase-js from broadcasting one tab's
// sign-in or sign-out to the others (it names its BroadcastChannel after the storage key).
const tabAuthStorage = (() => {
  try {
    let tabId = window.sessionStorage.getItem("cognibridge_tab_id");
    if (!tabId) {
      tabId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem("cognibridge_tab_id", tabId);
    }
    return { storage: window.sessionStorage, storageKey: `cognibridge-auth-${tabId}` };
  } catch {
    return {};
  }
})();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      ...tabAuthStorage,
    },
  })
  : null;
