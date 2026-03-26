import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 2 – Global dark theme and base layout", () => {
  it("globals.css sets background to #0a0a0a", () => {
    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    expect(css).toContain("#0a0a0a");
  });

  it("globals.css sets color-scheme to dark to prevent light mode flicker", () => {
    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    expect(css).toContain("color-scheme: dark");
  });

  it("globals.css imports Inter font", () => {
    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    expect(css).toContain("Inter");
  });

  it("globals.css imports JetBrains Mono font", () => {
    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    expect(css).toContain("JetBrains Mono");
  });

  it("tailwind.config.ts defines background color token", () => {
    const cfg = readFileSync(resolve(root, "tailwind.config.ts"), "utf8");
    expect(cfg).toContain("background");
    expect(cfg).toContain("var(--background)");
  });

  it("tailwind.config.ts defines text-highlight token", () => {
    const cfg = readFileSync(resolve(root, "tailwind.config.ts"), "utf8");
    expect(cfg).toContain("highlight");
  });

  it("tailwind.config.ts defines text-muted token", () => {
    const cfg = readFileSync(resolve(root, "tailwind.config.ts"), "utf8");
    expect(cfg).toContain("muted");
  });

  it("tailwind.config.ts defines bg-surface token", () => {
    const cfg = readFileSync(resolve(root, "tailwind.config.ts"), "utf8");
    expect(cfg).toContain("surface");
  });

  it("tailwind.config.ts defines border-border token", () => {
    const cfg = readFileSync(resolve(root, "tailwind.config.ts"), "utf8");
    expect(cfg).toContain("border");
  });

  it("layout.tsx uses bg-background class", () => {
    const layout = readFileSync(resolve(root, "app/layout.tsx"), "utf8");
    expect(layout).toContain("bg-background");
  });

  it("layout.tsx uses colorScheme dark to prevent flicker", () => {
    const layout = readFileSync(resolve(root, "app/layout.tsx"), "utf8");
    expect(layout).toContain("dark");
  });

  it("layout.tsx has correct metadata title", () => {
    const layout = readFileSync(resolve(root, "app/layout.tsx"), "utf8");
    expect(layout).toContain("Paper to Colab");
  });

  it("globals.css applies Inter font to body", () => {
    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    expect(css).toContain("font-family");
    expect(css).toContain("Inter");
  });

  it("globals.css applies JetBrains Mono to code/pre elements", () => {
    const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
    expect(css).toContain("JetBrains Mono");
  });
});
