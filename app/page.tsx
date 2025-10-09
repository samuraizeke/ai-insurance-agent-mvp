"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, FileCheck2, ShoppingBag } from "lucide-react";
import Button from "@/components/ui/Button";
import HomeCard from "@/components/HomeCard";

export default function HomePage() {
  return (
    <div className="space-y-8 md:space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-muted)] bg-white p-8 md:p-12 shadow-sm">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="font-display text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.05] tracking-tight"
          >
            <span className="block">
              Your <span className="gradient-text">Always Available</span>
            </span>
            <span className="block">AI Insurance Agent</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.38 }}
            className="mx-auto mt-5 max-w-2xl text-lg text-[var(--color-ink-2)]"
          >
            Get clarity on coverage, review your policy, or explore quotes—without the hold music.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="mt-7 flex items-center justify-center"
          >
            <Link href="/chat">
              <Button size="lg" variant="primary" className="rounded-full shadow-[0_6px_0_rgba(0,0,0,0.15)]">
                Get Started →
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section className="grid w-full gap-6 md:grid-cols-3 md:gap-7 xl:gap-8">
        <HomeCard
          accent="left"
          icon={<ShieldCheck className="h-6 w-6 text-[var(--color-primary)]" />}
          title="Ask Questions"
          blurb="Understand deductibles, liability, property damage, and what’s actually covered."
          bullets={["What does my liability cover?","Is water damage covered?","Do I need higher limits?"]}
          cta="Start Chat"
          href="/chat"
        />
        <HomeCard
          accent="center"
          icon={<FileCheck2 className="h-6 w-6 text-[var(--color-secondary)]" />}
          title="Review Your Policy"
          blurb="Upload your policy and get a plain-English summary with key limits and exclusions."
          bullets={["Summarize this PDF","Any important exclusions?","What’s my hail deductible?"]}
          cta="Review Policy"
          href="/chat"
        />
        <HomeCard
          accent="right"
          icon={<ShoppingBag className="h-6 w-6 text-[var(--color-primary)]" />}
          title="Shop New Coverage"
          blurb="Compare options for home, auto, renters, and umbrella coverage based on your needs."
          bullets={["Help me shop renters","Home + auto bundle options","Coverage for a landlord?"]}
          cta="Shop Coverage"
          href="/chat"
        />
      </section>
    </div>
  );
}
