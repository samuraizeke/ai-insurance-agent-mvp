"use client";

import { motion } from "framer-motion";
import Chat from "@/components/Chat";
import { db } from "@/lib/db";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function ChatPage() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col">
      {/* Hero */}
      <header className="mx-auto mt-10 text-center md:mt-16">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="font-display text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.08] tracking-tight"
        >
          <span className="block">
            Your <span className="gradient-text">Always Available</span>
          </span>
          <span className="block">AI Insurance Agent</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mx-auto mt-3 max-w-2xl text-[var(--color-ink-2)]"
        >
          Ask questions, review your policy, or shop new coverage — all in one conversation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.16, duration: 0.35 }}
          className="mt-5"
        >
          <Link href="/"><Button variant="ghost" size="sm" className="rounded-full border px-4 py-1.5">← Back to Home</Button></Link>
        </motion.div>
      </header>

      {/* Chat Container */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative mx-auto mt-8 flex w-full max-w-5xl flex-1 flex-col rounded-3xl border border-[var(--color-muted)] bg-white shadow-sm md:mt-12"
        style={{ minHeight: "80vh" }}
      >
        <Chat initialPolicy={db.profile.policy ?? null} />
      </motion.section>
    </div>
  );
}
