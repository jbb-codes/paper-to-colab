import { describe, it, expect } from "vitest";
import { STATUS_MESSAGES } from "../../lib/statusMessages";

describe("Task 4 – Processing status messages", () => {
  it("exports exactly 7 status messages", () => {
    expect(STATUS_MESSAGES).toHaveLength(7);
  });

  it("first message is about parsing PDF", () => {
    expect(STATUS_MESSAGES[0]).toContain("Parsing PDF");
  });

  it("second message mentions algorithms and formulations", () => {
    expect(STATUS_MESSAGES[1]).toContain("algorithms");
  });

  it("third message mentions synthetic data", () => {
    expect(STATUS_MESSAGES[2]).toContain("synthetic data");
  });

  it("fourth message mentions methodology and Python", () => {
    expect(STATUS_MESSAGES[3]).toContain("Python");
  });

  it("fifth message mentions tutorial narrative", () => {
    expect(STATUS_MESSAGES[4]).toContain("tutorial narrative");
  });

  it("sixth message mentions assembling Colab notebook", () => {
    expect(STATUS_MESSAGES[5]).toContain("Colab notebook");
  });

  it("seventh message mentions uploading to GitHub Gist", () => {
    expect(STATUS_MESSAGES[6]).toContain("GitHub Gist");
  });

  it("all messages are non-empty strings", () => {
    for (const msg of STATUS_MESSAGES) {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});
