import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 7 — Rate limiting middleware", () => {
  it("middleware.ts exists at project root", () => {
    expect(existsSync(resolve(root, "middleware.ts"))).toBe(true);
  });

  it("middleware covers /api/extract route", () => {
    const content = readFileSync(resolve(root, "middleware.ts"), "utf8");
    expect(content).toContain("/api/extract");
  });

  it("middleware covers /api/generate route", () => {
    const content = readFileSync(resolve(root, "middleware.ts"), "utf8");
    expect(content).toContain("/api/generate");
  });

  it("middleware returns 429 on rate limit exceeded", () => {
    const content = readFileSync(resolve(root, "middleware.ts"), "utf8");
    expect(content).toContain("429");
  });

  it("middleware sets Retry-After header", () => {
    const content = readFileSync(resolve(root, "middleware.ts"), "utf8");
    expect(content).toContain("Retry-After");
  });

  it("middleware includes note about Upstash for serverless", () => {
    const content = readFileSync(resolve(root, "middleware.ts"), "utf8");
    expect(content.toLowerCase()).toContain("upstash");
  });
});
