"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseConfig } from "@/lib/supabase/env";

export type BrowserSupabaseClient = ReturnType<typeof createClientComponentClient>;

let client: BrowserSupabaseClient | null = null;
let cachedConfig: SupabaseConfig | null = null;

export function getSupabaseBrowserClient(config: SupabaseConfig): BrowserSupabaseClient {
  if (!client || !cachedConfig || cachedConfig.url !== config.url || cachedConfig.anonKey !== config.anonKey) {
    client = createClientComponentClient({
      supabaseUrl: config.url,
      supabaseKey: config.anonKey,
    });
    cachedConfig = { ...config };
  }
  return client;
}
