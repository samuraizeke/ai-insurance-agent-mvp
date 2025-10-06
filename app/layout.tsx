import "./globals.css";
import { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import { alteHaas, leagueGothic } from "./fonts";

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "AI Insurance Agent",
  description: "Chat with an AI agent about P&C coverage",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={[
          alteHaas.variable,
          leagueGothic.variable,
          "min-h-screen antialiased app-bg", // <— global gradient background
          "text-[var(--color-ink)] font-sans",
        ].join(" ")}
      >
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">{children}</main>
      </body>
    </html>
  );
}
