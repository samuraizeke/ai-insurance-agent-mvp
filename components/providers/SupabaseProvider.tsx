"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Session, type User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, type BrowserSupabaseClient } from "@/lib/supabase/browser";
import type { SupabaseConfig } from "@/lib/supabase/env";

type SupabaseContextValue = {
  supabase: BrowserSupabaseClient;
  session: Session | null;
  user: User | null;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({
  children,
  session,
  user,
  supabaseConfig,
}: {
  children: ReactNode;
  session: Session | null;
  user: User | null;
  supabaseConfig: SupabaseConfig;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(supabaseConfig), [supabaseConfig]);
  const [currentSession, setCurrentSession] = useState<Session | null>(session);
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  useEffect(() => {
    setCurrentSession(session);
    setCurrentUser(user);
  }, [session, user]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setCurrentSession(nextSession);
      setCurrentUser(nextSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<SupabaseContextValue>(
    () => ({
      supabase,
      session: currentSession,
      user: currentUser,
    }),
    [supabase, currentSession, currentUser]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return ctx;
}
