import { describe, it, expect } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { mapAnthropicError } from "../../lib/mapAnthropicError";

function makeApiError(
  ErrorClass: new (...args: never[]) => InstanceType<typeof Anthropic.APIError>,
  status: number,
  message = "boom",
): InstanceType<typeof Anthropic.APIError> {
  return Object.assign(Object.create(ErrorClass.prototype), {
    status,
    message,
    name: ErrorClass.name,
  }) as InstanceType<typeof Anthropic.APIError>;
}

describe("mapAnthropicError", () => {
  it("maps AuthenticationError to a 401 with a key-check message", () => {
    const err = makeApiError(Anthropic.AuthenticationError, 401);
    expect(mapAnthropicError(err)).toEqual({
      status: 401,
      error: "Invalid Anthropic API key. Please check your key and try again.",
    });
  });

  it("maps RateLimitError to a 429 with a retry message", () => {
    const err = makeApiError(Anthropic.RateLimitError, 429);
    expect(mapAnthropicError(err)).toEqual({
      status: 429,
      error:
        "Anthropic rate limit exceeded. Please wait a minute before retrying.",
    });
  });

  it("maps BadRequestError to a 400 with a shorten-paper message", () => {
    const err = makeApiError(Anthropic.BadRequestError, 400);
    expect(mapAnthropicError(err)).toEqual({
      status: 400,
      error:
        "Anthropic rejected the request — the paper may be too long. Please try a shorter paper.",
    });
  });

  it("maps a generic APIError to its own status and message", () => {
    const err = makeApiError(Anthropic.APIError, 503, "upstream down");
    expect(mapAnthropicError(err)).toEqual({
      status: 503,
      error: "Anthropic API error: upstream down",
    });
  });

  it("defaults a generic APIError with no status to 500", () => {
    const err = makeApiError(Anthropic.APIError, undefined as never);
    delete (err as { status?: number }).status;
    expect(mapAnthropicError(err)).toEqual({
      status: 500,
      error: "Anthropic API error: boom",
    });
  });

  it("maps a non-Anthropic error to a generic 500", () => {
    expect(mapAnthropicError(new Error("whatever"))).toEqual({
      status: 500,
      error: "Generation failed. Please try again.",
    });
  });

  it("maps a non-Error thrown value to a generic 500", () => {
    expect(mapAnthropicError("some string")).toEqual({
      status: 500,
      error: "Generation failed. Please try again.",
    });
  });
});
