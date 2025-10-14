import { cookies } from "next/headers";
import { createRouteHandlerClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerComponentClient({
    cookies: () => cookieStore,
  });
}

export type AppSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function createSupabaseRouteClient() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({
    cookies: () => cookieStore,
  });
}
