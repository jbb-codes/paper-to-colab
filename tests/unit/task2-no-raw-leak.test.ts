import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 2 — No raw LLM content in 422 response", () => {
  it("generate route does not include raw field in any NextResponse.json call", () => {
    const content = readFileSync(resolve(root, "app/api/generate/route.ts"), "utf8");
    // Find lines that contain both NextResponse.json and raw:
    const matches = content.match(/NextResponse\.json\([^)]*raw:/g);
    expect(matches).toBeNull();
  });

  it("generate route logs raw content to console.error on parse failure", () => {
    const content = readFileSync(resolve(root, "app/api/generate/route.ts"), "utf8");
    expect(content).toContain("console.error");
  });
});
