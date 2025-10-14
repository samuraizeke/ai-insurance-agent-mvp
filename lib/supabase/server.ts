import { cookies } from "next/headers";
import { createRouteHandlerClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createServerComponentClient(
    {
      cookies,
    },
    {
      supabaseUrl: url,
      supabaseKey: anonKey,
    }
  );
}

export type AppSupabaseClient = ReturnType<typeof createSupabaseServerClient>;

export function createSupabaseRouteClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createRouteHandlerClient(
    {
      cookies,
    },
    {
      supabaseUrl: url,
      supabaseKey: anonKey,
    }
  );
}
