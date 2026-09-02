import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/notebookPrompt";
import { buildNotebook, titleToFilename } from "@/lib/buildNotebook";
import { uploadGist } from "@/lib/uploadGist";
import { scanForDangerousPatterns } from "@/lib/validateCells";
import {
  parseNotebookResponse,
  type NotebookCell,
} from "@/lib/parseNotebookResponse";
import { mapAnthropicError } from "@/lib/mapAnthropicError";

/**
 * Extracts the notebook title from the first level-one heading in a markdown cell.
 *
 * @param cells - The notebook cells to search
 * @returns The extracted title, or `"research-paper-notebook"` when no level-one heading is found
 */
function extractTitle(cells: NotebookCell[]): string {
  // Try to pull title from the first markdown cell's first H1
  const firstMarkdown = cells.find((c) => c.type === "markdown");
  if (firstMarkdown) {
    const match = firstMarkdown.source.match(/^#\s+(.+)/m);
    if (match) return match[1].trim();
  }
  return "research-paper-notebook";
}

/**
 * Generates a notebook from submitted paper text and returns the resulting notebook data.
 *
 * @param req - The request containing `paperText` and `apiKey` in its JSON body.
 * @returns A response containing the generated notebook, title, filename, and Colab URL, or an error response.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paperText, apiKey } = body as {
      paperText?: string;
      apiKey?: string;
    };

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Anthropic API key is required." },
        { status: 400 },
      );
    }

    if (!paperText || paperText.trim().length === 0) {
      return NextResponse.json(
        { error: "Paper text is required." },
        { status: 400 },
      );
    }

    const anthropic = new Anthropic({ apiKey: apiKey.trim() });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 16000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(paperText),
        },
      ],
    });

    const textBlock = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    const rawContent = textBlock?.text ?? "";

    // Parse the JSON array from the response
    let cells: NotebookCell[];
    try {
      cells = parseNotebookResponse(rawContent);
    } catch {
      console.error(
        "[generate] LLM parse failure, raw snippet:",
        rawContent.slice(0, 500),
      );
      return NextResponse.json(
        {
          error: `Failed to parse notebook cells from AI response. The model may have returned an invalid format. Please try again.`,
        },
        { status: 422 },
      );
    }

    // Layer 2 prompt injection defence: scan generated code cells for dangerous patterns
    const dangerousMatch = scanForDangerousPatterns(cells);
    if (dangerousMatch) {
      console.error(
        `[generate] Dangerous pattern "${dangerousMatch.pattern}" detected in cell ${dangerousMatch.cellIndex} — blocking response`,
      );
      return NextResponse.json(
        {
          error:
            "Generation blocked: the paper may contain adversarial content. Please try a different paper.",
        },
        { status: 422 },
      );
    }

    // Build the .ipynb notebook
    const title = extractTitle(cells);
    const notebook = buildNotebook(cells, title);
    const notebookJson = JSON.stringify(notebook, null, 2);
    const filename = `${titleToFilename(title)}.ipynb`;

    // Upload to GitHub Gist for Colab access
    let colabUrl: string | null = null;
    let gistError: string | null = null;
    try {
      const gistResult = await uploadGist(notebookJson, filename);
      colabUrl = gistResult.colabUrl;
    } catch (gistErr) {
      // Gist upload is non-critical — still return the notebook
      gistError =
        gistErr instanceof Error ? gistErr.message : "Gist upload failed";
    }

    return NextResponse.json({
      cells,
      notebookJson,
      filename,
      title,
      colabUrl,
      ...(gistError ? { gistError } : {}),
    });
  } catch (err: unknown) {
    if (!(err instanceof Anthropic.APIError)) {
      console.error("[generate] Unexpected error:", err);
    }
    const { status, error } = mapAnthropicError(err);
    return NextResponse.json({ error }, { status });
  }
}
