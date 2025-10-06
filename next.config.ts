// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Produce a self-contained server in .next/standalone */
  output: "standalone",

  /**
   * If ESLint errors are failing your Azure build, you can flip this to true.
   * Leave TypeScript errors ON (default) so you catch real compile issues.
   */
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
