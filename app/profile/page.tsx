import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PolicyFile, PolicyKind } from "@/lib/types";
import { fmt } from "@/lib/utils";

const POLICY_LABELS: Record<PolicyKind, string> = {
  home: "Home Policy",
  auto: "Auto Policy",
};

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await ensureProfile(supabase, user);
  const policyMap = profile.policies ?? { home: null, auto: null };
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-sm text-gray-600">
          Basic personal info and the policies currently on file.
        </p>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Personal Info</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" value={fullName} />
          <Field label="Email" value={profile.email} />
          <Field label="Phone" value={profile.phone || "—"} />
          <Field
            label="Address"
            value={
              profile.address
                ? `${profile.address}${profile.city ? `, ${profile.city}` : ""}${
                    profile.state ? `, ${profile.state}` : ""
                  }${profile.zip ? ` ${profile.zip}` : ""}`
                : "—"
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Policies</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {(Object.entries(policyMap) as Array<[PolicyKind, PolicyFile | null]>).map(
            ([kind, policy]) => (
              <div
                key={kind}
                className="rounded-xl border border-gray-200 bg-gray-50/80 p-4"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {POLICY_LABELS[kind]}
                </h3>
                {policy ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <Field label="File name" value={policy.name} />
                    <Field label="Type" value={policy.mime || "—"} />
                    <Field label="Size" value={`${Math.round(policy.size / 1024)} KB`} />
                    <Field label="Uploaded" value={fmt.date(policy.uploadedAt)} />
                    <div>
                      <a
                        className="text-xs font-medium text-[var(--color-primary)] underline"
                        href={policy.storedAt}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View / Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-600">
                    No {POLICY_LABELS[kind].toLowerCase()} uploaded yet.
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Disclaimer: This MVP is for demonstration only and does not provide legal, financial,
        or insurance advice.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
