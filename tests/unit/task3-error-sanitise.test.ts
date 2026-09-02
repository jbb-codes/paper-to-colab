import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../");

describe("Task 3 — Generic error messages to client", () => {
  it("extract route returns generic 'PDF parsing failed.' message", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8",
    );
    expect(content).toContain("PDF parsing failed.");
  });

  it("extract route does not forward raw err.message in the response string", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8",
    );
    expect(content).not.toContain("PDF parsing error: ${message}");
  });

  it("extract route logs real error server-side with console.error", () => {
    const content = readFileSync(
      resolve(root, "app/api/extract/route.ts"),
      "utf8",
    );
    expect(content).toContain("console.error");
  });

  it("generate route returns generic 'Generation failed. Please try again.' message", () => {
    const content = readFileSync(
      resolve(root, "lib/mapAnthropicError.ts"),
      "utf8",
    );
    expect(content).toContain("Generation failed. Please try again.");
  });

  it("generate route does not interpolate err.message into the generic catch response", () => {
    const content = readFileSync(
      resolve(root, "lib/mapAnthropicError.ts"),
      "utf8",
    );
    expect(content).not.toContain("Generation failed: ${message}");
  });
});
