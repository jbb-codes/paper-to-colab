/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse uses native Node modules — mark as server-only
  // In Next.js 14, use experimental.serverComponentsExternalPackages
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

module.exports = nextConfig;
