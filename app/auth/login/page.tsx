"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message ?? "Unable to sign in");
      setIsSubmitting(false);
      return;
    }

    if (!data.session) {
      // No immediate session (e.g., email verification). Nothing to redirect to yet.
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.getSession();
    const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/chat";
    router.replace(target);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Log in</h1>
        <p className="text-sm text-gray-600">
          Access your insurance assistant and securely manage your policy documents.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
            className="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex w-full justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-gray-600">
        Need an account?{" "}
        <Link
          className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
          href={{
            pathname: "/auth/register",
            query: redirectTo ? { redirectTo } : undefined,
          }}
        >
          Register here
        </Link>
        .
      </p>
    </div>
  );
}
