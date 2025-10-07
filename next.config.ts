import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  /**
   * Generate the standalone server output so that Azure App Service
   * deployments can copy the self-contained `.next/standalone` bundle.
   * The GitHub Action deploy workflow expects this directory to exist.
   */
  output: "standalone",
};

export default nextConfig;
