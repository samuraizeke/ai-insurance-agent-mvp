type SupabaseConfig = {
  url: string;
  anonKey: string;
};

const URL_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_PROJECT_URL"] as const;
const ANON_KEY_KEYS = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"] as const;

export function getSupabaseConfig(): SupabaseConfig {
  const resolvedUrl = resolveFirst(URL_KEYS);
  const resolvedAnonKey = resolveFirst(ANON_KEY_KEYS);

  const url = resolvedUrl?.value ?? "";
  const anonKey = resolvedAnonKey?.value ?? "";

  if (!url || !anonKey) {
    const missingParts = [
      !url
        ? `URL (${URL_KEYS.join(", ")})`
        : null,
      !anonKey
        ? `anon key (${ANON_KEY_KEYS.join(", ")})`
        : null,
    ]
      .filter(Boolean)
      .join(" and ");

    const attemptedUrlKeys = formatKeyStatus(URL_KEYS);
    const attemptedAnonKeys = formatKeyStatus(ANON_KEY_KEYS);

    throw new Error(
      [
        `Missing Supabase ${missingParts}.`,
        "Checked environment variables:",
        `  url keys -> ${attemptedUrlKeys}`,
        `  anon keys -> ${attemptedAnonKeys}`,
        "Ensure the appropriate environment variables are set in your deployment environment.",
      ].join(" ")
    );
  }

  return { url, anonKey };
}

function resolveFirst(keys: readonly string[]) {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return { key, value: raw.trim() };
    }
  }
  return null;
}

function formatKeyStatus(keys: readonly string[]) {
  return keys
    .map((key) => {
      const raw = process.env[key];
      if (raw === undefined) {
        return `${key}: <unset>`;
      }
      if (typeof raw !== "string") {
        return `${key}: <non-string>`;
      }
      return `${key}: ${raw.trim().length > 0 ? "<set>" : "<empty>"}`;
    })
    .join(", ");
}
