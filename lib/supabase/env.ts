export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

const URL_KEYS = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL"] as const;
const ANON_KEY_KEYS = ["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function getSupabaseConfig(): SupabaseConfig {
  const url = resolveFirst(URL_KEYS);
  const anonKey = resolveFirst(ANON_KEY_KEYS);

  if (!url || !anonKey) {
    const missingParts = [
      !url ? `URL (${URL_KEYS.join(", ")})` : null,
      !anonKey ? `anon key (${ANON_KEY_KEYS.join(", ")})` : null,
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
    const candidate = readEnvValue(key);
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function readEnvValue(key: string) {
  const env = process.env as Record<string, string | undefined>;
  return env[key] ?? env[`APPSETTING_${key}`];
}

function formatKeyStatus(keys: readonly string[]) {
  return keys
    .map((key) => {
      const env = process.env as Record<string, string | undefined>;
      const raw = env[key] ?? env[`APPSETTING_${key}`];
      if (raw === undefined) {
        return `${key}: <unset>`;
      }
      if (raw.trim().length === 0) {
        return `${key}: <empty>`;
      }
      return `${key}: <set>`;
    })
    .join(", ");
}
