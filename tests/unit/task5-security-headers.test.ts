import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 5 — HTTP security headers in next.config.js", () => {
  let config: string;
  config = readFileSync(resolve(root, "next.config.js"), "utf8");

  it("sets X-Frame-Options header", () => {
    expect(config).toContain("X-Frame-Options");
  });

  it("sets X-Content-Type-Options header", () => {
    expect(config).toContain("X-Content-Type-Options");
  });

  it("sets Referrer-Policy header", () => {
    expect(config).toContain("Referrer-Policy");
  });

  it("sets Permissions-Policy header", () => {
    expect(config).toContain("Permissions-Policy");
  });

  it("sets Strict-Transport-Security header", () => {
    expect(config).toContain("Strict-Transport-Security");
  });

  it("sets Content-Security-Policy header", () => {
    expect(config).toContain("Content-Security-Policy");
  });

  it("exports a headers() function", () => {
    expect(config).toContain("headers()");
  });
});
