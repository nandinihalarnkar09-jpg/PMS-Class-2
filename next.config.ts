import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "svix"],
  allowedDevOrigins: ["*.cursorvm.com", "*.agent.cvm.dev", "localhost", "127.0.0.1"],
};

export default nextConfig;
