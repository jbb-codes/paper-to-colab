import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 6 — CORS origin restriction", () => {
  it("next.config.js sets Access-Control-Allow-Origin on API routes", () => {
    const config = readFileSync(resolve(root, "next.config.js"), "utf8");
    expect(config).toContain("Access-Control-Allow-Origin");
  });

  it("next.config.js scopes CORS to /api routes", () => {
    const config = readFileSync(resolve(root, "next.config.js"), "utf8");
    expect(config).toContain("/api/(.*)");
  });

  it(".env.example exists", () => {
    expect(existsSync(resolve(root, ".env.example"))).toBe(true);
  });

  it(".env.example documents NEXT_PUBLIC_BASE_URL", () => {
    const content = readFileSync(resolve(root, ".env.example"), "utf8");
    expect(content).toContain("NEXT_PUBLIC_BASE_URL");
  });
});
