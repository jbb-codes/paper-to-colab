/** @type {import('next').NextConfig} */

// CORS: allow requests only from the configured origin.
// Set NEXT_PUBLIC_BASE_URL in .env.local for production (e.g. https://paper-to-colab.vercel.app).
const ALLOWED_ORIGIN =
  process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// Next.js dev mode uses eval() for React Refresh / HMR, so we need
// 'unsafe-eval' in script-src during development. Production keeps the
// stricter policy.
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  // Prevent the page from being embedded in iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the origin on cross-origin requests, no path
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable access to camera, mic, and geolocation
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Force HTTPS for 2 years (only effective in production over TLS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Restrict resource loading to same origin; allow Anthropic + GitHub for API calls
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://api.anthropic.com https://api.github.com",
    ].join("; "),
  },
];

const corsHeaders = [
  { key: "Access-Control-Allow-Origin", value: ALLOWED_ORIGIN },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type" },
];

const nextConfig = {
  // Standalone output for Docker — copies only the files needed to run
  output: "standalone",
  // pdf-parse uses native Node modules — mark as server-only
  serverExternalPackages: ["pdf-parse"],

  async headers() {
    return [
      // Apply security headers to all routes
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Apply CORS restriction to API routes only
      {
        source: "/api/(.*)",
        headers: corsHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
