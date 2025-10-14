import "./globals.css";
import type { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { SupabaseListener } from "@/components/providers/SupabaseListener";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { alteHaas, leagueGothic } from "./fonts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Samurai Insurance",
  description: "Chat with an AI agent about P&C coverage",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body
        className={[
          alteHaas.variable,
          leagueGothic.variable,
          "flex min-h-screen flex-col antialiased app-bg", // <— global gradient background
          "text-[var(--color-ink)] font-sans",
        ].join(" ")}
      >
        <SupabaseProvider session={session} user={user}>
          <SupabaseListener accessToken={session?.access_token ?? null} />
          <NavBar />
          <main className="mx-auto flex w-full max-w-[min(2000px,96vw)] flex-1 flex-col overflow-hidden px-3 py-6 sm:px-4 lg:px-5">
            {children}
          </main>
        </SupabaseProvider>
      </body>
    </html>
  );
}
