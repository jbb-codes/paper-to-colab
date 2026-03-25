import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/notebookPrompt";

export interface NotebookCell {
  type: "markdown" | "code";
  source: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paperText, apiKey } = body as {
      paperText?: string;
      apiKey?: string;
    };

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Groq API key is required." },
        { status: 400 }
      );
    }

    if (!paperText || paperText.trim().length === 0) {
      return NextResponse.json(
        { error: "Paper text is required." },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey: apiKey.trim() });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildUserPrompt(paperText),
        },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    });

    const rawContent = completion.choices[0]?.message?.content ?? "";

    // Parse the JSON array from the response
    let cells: NotebookCell[];
    try {
      // Strip any markdown code fences if the model added them
      const cleaned = rawContent
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      cells = JSON.parse(cleaned);

      if (!Array.isArray(cells)) {
        throw new Error("Response is not an array");
      }

      // Validate each cell
      cells = cells
        .filter(
          (cell): cell is NotebookCell =>
            typeof cell === "object" &&
            cell !== null &&
            (cell.type === "markdown" || cell.type === "code") &&
            typeof cell.source === "string"
        );

      if (cells.length === 0) {
        throw new Error("No valid cells found in response");
      }
    } catch (parseErr) {
      return NextResponse.json(
        {
          error: `Failed to parse notebook cells from AI response. The model may have returned an invalid format. Please try again.`,
          raw: rawContent.slice(0, 500),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ cells });
  } catch (err: unknown) {
    if (err instanceof Groq.APIError) {
      const status = err.status ?? 500;
      const message =
        status === 401
          ? "Invalid Groq API key. Please check your key and try again."
          : status === 429
          ? "Groq API rate limit exceeded. Please wait a moment and try again."
          : `Groq API error: ${err.message}`;

      return NextResponse.json({ error: message }, { status });
    }

    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
