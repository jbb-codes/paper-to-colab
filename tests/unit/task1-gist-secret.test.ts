import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 1 — Gist visibility: secret not public", () => {
  it("uploadGist.ts sets public: false", () => {
    const content = readFileSync(resolve(root, "lib/uploadGist.ts"), "utf8");
    expect(content).toContain("public: false");
  });

  it("uploadGist.ts does not set public: true", () => {
    const content = readFileSync(resolve(root, "lib/uploadGist.ts"), "utf8");
    expect(content).not.toContain("public: true");
  });
});
