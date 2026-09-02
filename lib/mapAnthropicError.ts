import Anthropic from "@anthropic-ai/sdk";

export interface MappedError {
  status: number;
  error: string;
}

/**
 * Maps an error thrown by the Anthropic SDK to an HTTP status and
 * user-facing message. Falls back to a generic 500 for anything
 * that isn't a recognized Anthropic API error.
 */
export function mapAnthropicError(err: unknown): MappedError {
  if (err instanceof Anthropic.AuthenticationError) {
    return {
      status: 401,
      error: "Invalid Anthropic API key. Please check your key and try again.",
    };
  }

  if (err instanceof Anthropic.RateLimitError) {
    return {
      status: 429,
      error:
        "Anthropic rate limit exceeded. Please wait a minute before retrying.",
    };
  }

  if (err instanceof Anthropic.BadRequestError) {
    return {
      status: 400,
      error:
        "Anthropic rejected the request — the paper may be too long. Please try a shorter paper.",
    };
  }

  if (err instanceof Anthropic.APIError) {
    return {
      status: err.status ?? 500,
      error: `Anthropic API error: ${err.message}`,
    };
  }

  return {
    status: 500,
    error: "Generation failed. Please try again.",
  };
}
