import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse uses native Node modules — mark as server-only
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
