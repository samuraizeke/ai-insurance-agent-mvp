import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-md rounded-3xl border border-[var(--color-muted)] bg-white p-8 shadow-sm sm:p-10">
        {children}
      </div>
    </div>
  );
}
