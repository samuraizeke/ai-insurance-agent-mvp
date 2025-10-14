"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export type BrowserSupabaseClient = ReturnType<typeof createClientComponentClient>;

let client: BrowserSupabaseClient | null = null;

export function getSupabaseBrowserClient(): BrowserSupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }

    client = createClientComponentClient({
      supabaseUrl: url,
      supabaseKey: anonKey,
    });
  }

  return client;
}
