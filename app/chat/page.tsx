import ChatPageClient from "@/components/ChatPageClient";
import { db, ensurePolicyMap } from "@/lib/db";

export default function ChatPage() {
  const profile = db.profile;
  const policyMap = ensurePolicyMap(profile);
  const firstName = profile.first_name || "there";

  return (
    <ChatPageClient
      firstName={firstName}
      initialPolicies={{
        home: policyMap.home ?? null,
        auto: policyMap.auto ?? null,
      }}
    />
  );
}
