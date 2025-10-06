"use client";
import Link from "next/link";
import Image from "next/image";

export default function NavBar() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "AI Insurance Agent";
  const link =
    "rounded-lg px-2 py-1 hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30";
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-muted)] bg-[color:hsla(0,0%,100%,.7)] backdrop-blur supports-[backdrop-filter]:bg-[color:hsla(0,0%,100%,.55)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="logo" width={28} height={28} />
          <span className="font-display text-lg tracking-tight">{appName}</span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link className={link} href="/">Home</Link>
          <Link className={link} href="/chat">Chat</Link>
          <Link className={link} href="/profile">Profile</Link>
        </nav>
      </div>
    </header>
  );
}
