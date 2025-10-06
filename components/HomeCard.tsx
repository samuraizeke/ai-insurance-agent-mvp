"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

type Props = {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  bullets: string[];
  cta: string;
  href: string;
  accent?: "left" | "center" | "right";
};

export default function HomeCard({
  icon,
  title,
  blurb,
  bullets,
  cta,
  href,
  accent = "center",
}: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-3xl border border-[var(--color-muted)] bg-white p-6 shadow-sm"
    >
      {/* top accent border */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{
          background:
            accent === "left"
              ? "linear-gradient(90deg,var(--color-primary),transparent)"
              : accent === "right"
              ? "linear-gradient(90deg,transparent,var(--color-primary))"
              : "linear-gradient(90deg,var(--color-secondary),transparent,var(--color-secondary))",
        }}
      />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-warm)]/60">
          {icon}
        </div>
        <h3 className="font-display text-xl tracking-tight">{title}</h3>
      </div>

      <p className="mt-3 text-sm text-[var(--color-ink-2)]">{blurb}</p>

      <ul className="mt-4 space-y-2 text-sm">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2 w-2 flex-none rounded-full bg-[var(--color-primary)]/80" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Link href={href}>
          <Button
            variant="outline"
            size="md"
            className="rounded-full border-2 text-[var(--color-primary)] hover:bg-[var(--color-warm)]/40"
          >
            {cta}
          </Button>
        </Link>
      </div>
    </motion.article>
  );
}
