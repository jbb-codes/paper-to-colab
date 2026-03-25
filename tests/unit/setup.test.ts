import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 1 – Project setup verification", () => {
  it("package.json exists and has the correct name", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.name).toBe("paper-to-colab");
  });

  it("package.json lists next@14 as a dependency", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.dependencies["next"]).toMatch(/^14\./);
  });

  it("package.json lists groq-sdk as a dependency", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.dependencies["groq-sdk"]).toBeDefined();
  });

  it("package.json lists pdf-parse as a dependency", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.dependencies["pdf-parse"]).toBeDefined();
  });

  it("tailwind.config.ts exists", () => {
    expect(existsSync(resolve(root, "tailwind.config.ts"))).toBe(true);
  });

  it("next.config.js exists and configures pdf-parse as external package", () => {
    const content = readFileSync(resolve(root, "next.config.js"), "utf8");
    expect(content).toContain("pdf-parse");
  });

  it("app/layout.tsx exists", () => {
    expect(existsSync(resolve(root, "app/layout.tsx"))).toBe(true);
  });

  it("app/globals.css contains Tailwind directives", () => {
    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    expect(css).toContain("@tailwind base");
    expect(css).toContain("@tailwind components");
    expect(css).toContain("@tailwind utilities");
  });

  it("groq-sdk is installed in node_modules", () => {
    expect(existsSync(resolve(root, "node_modules/groq-sdk"))).toBe(true);
  });

  it("pdf-parse is installed in node_modules", () => {
    expect(existsSync(resolve(root, "node_modules/pdf-parse"))).toBe(true);
  });
});
