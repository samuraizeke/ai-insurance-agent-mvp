"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

const INITIAL_STATE: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

export default function RegisterPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);

  const updateField = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setRequiresVerification(false);
    setIsSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim() || null,
          last_name: form.lastName.trim() || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message ?? "Unable to register");
      setIsSubmitting(false);
      return;
    }

    if (!data.session) {
      setRequiresVerification(true);
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
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Create your account</h1>
        <p className="text-sm text-gray-600">
          Register to securely store policy documents and chat with the AI insurance agent.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">First name</span>
            <input
              value={form.firstName}
              onChange={(event) => updateField("firstName")(event.target.value)}
              placeholder="Alex"
              className="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Last name</span>
            <input
              value={form.lastName}
              onChange={(event) => updateField("lastName")(event.target.value)}
              placeholder="Johnson"
              className="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email")(event.target.value)}
            required
            placeholder="you@example.com"
            className="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password")(event.target.value)}
            required
            minLength={8}
            placeholder="Minimum 8 characters"
            className="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {requiresVerification ? (
          <p className="text-sm text-[var(--color-secondary)]">
            Check your email to confirm the account before logging in.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex w-full justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-gray-600">
        Already registered?{" "}
        <Link
          className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
          href={{
            pathname: "/auth/login",
            query: redirectTo ? { redirectTo } : undefined,
          }}
        >
          Log in
        </Link>
        .
      </p>
    </div>
  );
}
