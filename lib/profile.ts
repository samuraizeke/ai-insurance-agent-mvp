import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { CustomerProfile, PolicyFile, PolicyKind, PolicyMap } from "@/lib/types";

type SupabaseUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type ProfileRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  birthday?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PolicyRow = {
  id: number;
  profile_id: number;
  kind: PolicyKind;
  name: string;
  mime: string | null;
  size: number | string;
  stored_at: string;
  uploaded_at: string | null;
  text_content?: string | null;
};

const EMPTY_POLICY_MAP: PolicyMap = { home: null, auto: null };

async function loadCustomerProfileByEmail(
  supabase: AppSupabaseClient,
  email: string
): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone, address, city, state, zip, birthday"
    )
    .eq("email", email)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  const row = (data ?? null) as ProfileRow | null;
  if (!row) {
    return null;
  }

  const policies = await loadPolicyMap(supabase, row.id);

  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    birthday: row.birthday,
    updated_at: row.updated_at,
    policies,
  };
}

export async function loadCustomerProfile(
  supabase: AppSupabaseClient,
  email: string | null | undefined
): Promise<CustomerProfile | null> {
  if (!email) {
    return null;
  }
  return loadCustomerProfileByEmail(supabase, email.toLowerCase().trim());
}

export async function ensureProfile(
  supabase: AppSupabaseClient,
  user: SupabaseUserLike
): Promise<CustomerProfile> {
  const email = user.email?.toLowerCase().trim();
  if (!email) {
    throw new Error("Cannot resolve profile without a user email.");
  }

  const existing = await loadCustomerProfileByEmail(supabase, email);
  if (existing) {
    return existing;
  }

  const defaults = user.user_metadata ?? {};
  const firstName =
    typeof defaults.first_name === "string" ? defaults.first_name.trim() || null : null;
  const lastName =
    typeof defaults.last_name === "string" ? defaults.last_name.trim() || null : null;

  const baseInsert = {
    email,
    first_name: firstName,
    last_name: lastName,
    phone: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    birthday: null,
  };

  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      ...baseInsert,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select(
      "id, first_name, last_name, email, phone, address, city, state, zip, birthday"
    )
    .single();

  if (error) {
    // If a concurrent insert happened (duplicate email), fall back to the row that now exists.
    if (error.code === "23505") {
      const fallback = await loadCustomerProfileByEmail(supabase, email);
      if (fallback) {
        return fallback;
      }
    }
    throw error;
  }

  const row = data as ProfileRow;

  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    birthday: row.birthday,
    policies: { ...EMPTY_POLICY_MAP },
  };
}

export async function loadPolicyMap(
  supabase: AppSupabaseClient,
  profileId: number
): Promise<PolicyMap> {
  const { data, error } = await supabase
    .from("policies")
    .select("id, profile_id, kind, name, mime, size, stored_at, uploaded_at, text_content")
    .eq("profile_id", profileId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PolicyRow[];
  if (!rows.length) {
    return { ...EMPTY_POLICY_MAP };
  }

  const map: PolicyMap = { ...EMPTY_POLICY_MAP };

  for (const policy of rows) {
    const uploadedAt = policy.uploaded_at ? Date.parse(policy.uploaded_at) : Date.now();
    const size =
      typeof policy.size === "number"
        ? policy.size
        : Number(policy.size ?? 0) || 0;
    const normalized: PolicyFile = {
      id: policy.id,
      name: policy.name,
      mime: policy.mime,
      size,
      storedAt: policy.stored_at,
      uploadedAt: Number.isFinite(uploadedAt) ? uploadedAt : Date.now(),
      kind: policy.kind,
      textContent: policy.text_content ?? null,
      profileId: policy.profile_id,
    };

    map[policy.kind] = normalized;
  }

  return map;
}
