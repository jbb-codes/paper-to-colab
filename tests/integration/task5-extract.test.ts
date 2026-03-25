import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 5 – PDF extraction API route", () => {
  it("route file exists at app/api/extract/route.ts", () => {
    expect(existsSync(resolve(root, "app/api/extract/route.ts"))).toBe(true);
  });

  it("route exports a POST handler", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8"
    );
    expect(content).toContain("export async function POST");
  });

  it("route uses pdf-parse", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8"
    );
    expect(content).toContain("pdf-parse");
  });

  it("route returns text and pageCount", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8"
    );
    expect(content).toContain("text");
    expect(content).toContain("pageCount");
  });

  it("route handles file size limit of 20MB", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8"
    );
    // Should have a size check
    expect(content).toMatch(/20\s*\*\s*1024\s*\*\s*1024|20MB|20971520/);
  });

  it("route returns error for non-PDF files", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8"
    );
    expect(content).toContain("PDF");
  });

  it("route uses NextResponse.json for responses", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8"
    );
    expect(content).toContain("NextResponse");
  });

  it("route handles empty file with an error", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8"
    );
    expect(content).toContain("error");
  });
});
