"use client";

import { motion } from "framer-motion";
import Chat from "@/components/Chat";
import type { PolicyMap } from "@/lib/types";

type ChatPageClientProps = {
  firstName: string;
  initialPolicies: Partial<PolicyMap>;
};

export default function ChatPageClient({
  firstName,
  initialPolicies,
}: ChatPageClientProps) {
  return (
    <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden bg-gradient-to-b from-white via-white to-[var(--color-sand)]/20">
      <div className="flex flex-1 min-h-0 w-full flex-col overflow-hidden px-3 py-8 sm:px-4 lg:px-8 xl:px-12">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 shrink-0 sm:mb-8"
        >
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-gray-900"
          >
            <span className="gradient-text">Hello, {firstName}.</span>{" "}
            <span className="text-gray-900">How can I help you today?</span>
          </motion.h1>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="relative flex flex-1 min-h-0 overflow-hidden"
        >
          <Chat
            initialPolicies={{
              home: initialPolicies.home ?? null,
              auto: initialPolicies.auto ?? null,
            }}
          />
        </motion.section>
      </div>
    </div>
  );
}
