import { redirect } from "next/navigation";
import ChatPageClient from "@/components/ChatPageClient";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await ensureProfile(supabase, user);

  const policyMap = profile.policies ?? { home: null, auto: null };
  const firstName =
    profile.first_name ||
    user.user_metadata?.first_name ||
    (user.email ? user.email.split("@")[0] : "there");
  const fallbackLabel = profile.first_name || user.user_metadata?.first_name || user.email || "User";
  const userInitial = fallbackLabel.charAt(0)?.toUpperCase() || "U";

  return (
    <ChatPageClient
      firstName={firstName}
      userInitial={userInitial}
      initialPolicies={{
        home: policyMap.home ?? null,
        auto: policyMap.auto ?? null,
      }}
    />
  );
}
