import { describe, it, expect } from "vitest";
import { STATUS_MESSAGES } from "../../lib/statusMessages";

describe("STATUS_MESSAGES — structure", () => {
  it("is an array", () => {
    expect(Array.isArray(STATUS_MESSAGES)).toBe(true);
  });

  it("every message ends with '...'", () => {
    for (const msg of STATUS_MESSAGES) {
      expect(msg).toMatch(/\.\.\.$/);
    }
  });

  it("messages are in a logical pipeline order (PDF first, Gist last)", () => {
    expect(STATUS_MESSAGES[0]).toMatch(/PDF/i);
    expect(STATUS_MESSAGES[STATUS_MESSAGES.length - 1]).toMatch(/Gist/i);
  });

  it("no duplicate messages", () => {
    const unique = new Set(STATUS_MESSAGES);
    expect(unique.size).toBe(STATUS_MESSAGES.length);
  });
});
