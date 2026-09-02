import { describe, it, expect } from "vitest";
import { parseNotebookResponse } from "../../lib/parseNotebookResponse";

describe("parseNotebookResponse", () => {
  it("parses a plain JSON array of cells", () => {
    const raw = JSON.stringify([
      { type: "markdown", source: "# Title" },
      { type: "code", source: "print(1)" },
    ]);
    expect(parseNotebookResponse(raw)).toEqual([
      { type: "markdown", source: "# Title" },
      { type: "code", source: "print(1)" },
    ]);
  });

  it("strips ```json ... ``` code fences", () => {
    const raw =
      "```json\n" +
      JSON.stringify([{ type: "code", source: "x = 1" }]) +
      "\n```";
    expect(parseNotebookResponse(raw)).toEqual([
      { type: "code", source: "x = 1" },
    ]);
  });

  it("strips plain ``` code fences", () => {
    const raw =
      "```\n" + JSON.stringify([{ type: "code", source: "x = 1" }]) + "\n```";
    expect(parseNotebookResponse(raw)).toEqual([
      { type: "code", source: "x = 1" },
    ]);
  });

  it("filters out cells with invalid type", () => {
    const raw = JSON.stringify([
      { type: "code", source: "x = 1" },
      { type: "bogus", source: "y = 2" },
    ]);
    expect(parseNotebookResponse(raw)).toEqual([
      { type: "code", source: "x = 1" },
    ]);
  });

  it("filters out cells with non-string source", () => {
    const raw = JSON.stringify([
      { type: "code", source: "x = 1" },
      { type: "code", source: 42 },
    ]);
    expect(parseNotebookResponse(raw)).toEqual([
      { type: "code", source: "x = 1" },
    ]);
  });

  it("filters out null/non-object entries", () => {
    const raw = JSON.stringify([
      { type: "code", source: "x = 1" },
      null,
      "oops",
    ]);
    expect(parseNotebookResponse(raw)).toEqual([
      { type: "code", source: "x = 1" },
    ]);
  });

  it("throws when response is not valid JSON", () => {
    expect(() => parseNotebookResponse("not json")).toThrow();
  });

  it("throws when the parsed JSON is not an array", () => {
    expect(() =>
      parseNotebookResponse(JSON.stringify({ type: "code", source: "x" })),
    ).toThrow();
  });

  it("throws when no cells survive validation", () => {
    expect(() =>
      parseNotebookResponse(JSON.stringify([{ type: "bogus", source: "x" }])),
    ).toThrow();
  });
});
