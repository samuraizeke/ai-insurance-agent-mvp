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
          "flex min-h-screen flex-col antialiased app-bg", // <— global gradient background
          "text-[var(--color-ink)] font-sans",
        ].join(" ")}
      >
        <NavBar />
        <main className="mx-auto flex w-full max-w-[min(2000px,96vw)] flex-1 flex-col overflow-hidden px-3 py-6 sm:px-4 lg:px-5">
          {children}
        </main>
      </body>
    </html>
  );
}
