import { cookies } from "next/headers";
import { createRouteHandlerClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export function createSupabaseServerClient() {
  return createServerComponentClient({
    cookies,
  });
}

export type AppSupabaseClient = ReturnType<typeof createSupabaseServerClient>;

export function createSupabaseRouteClient() {
  return createRouteHandlerClient({
    cookies,
  });
}
