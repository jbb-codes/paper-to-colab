import { NextRequest, NextResponse } from "next/server";

// In-memory sliding-window rate limiter (10 requests per 60 seconds per IP).
//
// NOTE: This implementation is suitable for single-instance (Node.js) deployments only.
// For serverless / edge runtimes (e.g. Vercel), each function invocation gets a fresh
// process — the Map is not shared across instances. For production serverless, replace
// this with @upstash/ratelimit backed by Upstash Redis:
// https://github.com/upstash/ratelimit-js

const WINDOW_MS = 60_000; // 60 seconds
const MAX_REQUESTS = 10;

const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Keep only timestamps within the current window
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(
    (t) => t > windowStart
  );

  if (timestamps.length >= MAX_REQUESTS) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

export function middleware(request: NextRequest) {
  // Resolve client IP from standard proxy headers, fallback to "unknown"
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  return NextResponse.next();
}

// Only intercept the two API routes that call external services
export const config = {
  matcher: ["/api/extract", "/api/generate"],
};
