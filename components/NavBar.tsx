"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export default function NavBar() {
  const { supabase, session, user } = useSupabase();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Samurai Insurance";
  const linkClasses =
    "rounded-lg px-2 py-1 hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/auth/login");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-muted)] bg-[color:hsla(0,0%,100%,.7)] backdrop-blur supports-[backdrop-filter]:bg-[color:hsla(0,0%,100%,.55)]">
      <div className="mx-auto flex w-full max-w-[min(2000px,96vw)] items-center justify-between px-3 py-3 sm:px-4">
        <div className="flex items-center">
          <Link href="/" className="mr-1">
            <Image src="/Samurai_Insurance_Logo.svg" alt="logo" width={24} height={24} />
          </Link>
          <Link
            href="/"
            className="rounded-sm px-1 font-display text-xl font-medium tracking-tight text-[var(--color-foreground)] transition-colors hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          >
            {appName}
          </Link>
        </div>

        <nav className="flex items-center gap-2 text-sm">
          <Link className={linkClasses} href="/">
            Home
          </Link>
          {(session || user) ? (
            <>
              <Link className={linkClasses} href="/chat">
                Chat
              </Link>
              <Link className={linkClasses} href="/profile">
                Profile
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-lg px-2 py-1 text-[var(--color-secondary)] transition hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link className={linkClasses} href="/auth/login">
                Log in
              </Link>
              <Link className={linkClasses} href="/auth/register">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
