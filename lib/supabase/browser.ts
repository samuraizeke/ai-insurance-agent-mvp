"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseConfig } from "@/lib/supabase/env";

export type BrowserSupabaseClient = ReturnType<typeof createClientComponentClient>;

let client: BrowserSupabaseClient | null = null;

export function getSupabaseBrowserClient(): BrowserSupabaseClient {
  if (!client) {
    const { url, anonKey } = getSupabaseConfig();

    client = createClientComponentClient({
      supabaseUrl: url,
      supabaseKey: anonKey,
    });
  }

  return client;
}
