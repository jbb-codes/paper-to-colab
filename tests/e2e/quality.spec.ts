import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * Quality test — runs with a REAL Groq API key and research.pdf.
 *
 * Run manually:   npm run test:e2e -- --project=quality
 * Requires:       GROQ_API_KEY environment variable set
 *
 * NOT run in CI (excluded from the default "chromium" project).
 */

test.describe("Quality test — real notebook generation", () => {
  test.setTimeout(120_000); // 2 minute timeout for real API call

  test("generate notebook from research.pdf and validate output", async ({
    page,
  }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      test.skip(true, "GROQ_API_KEY env var not set — skipping quality test");
      return;
    }

    await page.goto("/");

    // Step 1: Enter real API key
    await page.getByTestId("api-key-input").fill(apiKey);
    await page.screenshot({
      path: "tests/screenshots/task4-quality-01-api-key.png",
    });

    // Step 2: Upload research.pdf
    const pdfPath = path.resolve(__dirname, "../../research.pdf");
    expect(fs.existsSync(pdfPath)).toBe(true);

    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);
    await page.screenshot({
      path: "tests/screenshots/task4-quality-02-pdf-uploaded.png",
    });

    // Step 3: Click generate
    await expect(page.getByTestId("generate-button")).toBeEnabled();
    await page.getByTestId("generate-button").click();

    // Step 4: Should see processing view
    await expect(page.getByTestId("processing-view")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({
      path: "tests/screenshots/task4-quality-03-processing.png",
    });

    // Step 5: Wait for result (up to 120s)
    await expect(page.getByTestId("result-view")).toBeVisible({
      timeout: 120_000,
    });
    await page.screenshot({
      path: "tests/screenshots/task4-quality-04-result.png",
    });

    // Step 6: Download the notebook
    const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.getByTestId("download-button").click();
    const download = await downloadPromise;

    const downloadPath = path.resolve(
      __dirname,
      "../../tests/screenshots/quality-notebook.ipynb"
    );
    await download.saveAs(downloadPath);
    await page.screenshot({
      path: "tests/screenshots/task4-quality-05-downloaded.png",
    });

    // === Validation ===

    const notebookRaw = fs.readFileSync(downloadPath, "utf8");

    // V1: Valid JSON
    let notebook: Record<string, unknown>;
    expect(() => {
      notebook = JSON.parse(notebookRaw);
    }).not.toThrow();
    notebook = JSON.parse(notebookRaw);

    // V2: Has nbformat field
    expect(notebook.nbformat).toBe(4);

    // V3: Has cells array with >= 6 cells
    const cells = notebook.cells as Array<{
      cell_type: string;
      source: string[];
    }>;
    expect(Array.isArray(cells)).toBe(true);
    expect(cells.length).toBeGreaterThanOrEqual(6);

    // V4: At least one code cell present
    const codeCells = cells.filter((c) => c.cell_type === "code");
    expect(codeCells.length).toBeGreaterThan(0);

    // V5: At least one markdown cell present
    const mdCells = cells.filter((c) => c.cell_type === "markdown");
    expect(mdCells.length).toBeGreaterThan(0);

    // V6: Code cells have non-empty source
    for (const cell of codeCells) {
      const source = Array.isArray(cell.source)
        ? cell.source.join("")
        : String(cell.source);
      expect(source.trim().length).toBeGreaterThan(0);
    }

    // V7: No dangerous patterns in code cells (safety check)
    const dangerousPatterns = [
      "os.system",
      "subprocess",
      "eval(",
      "exec(",
      "__import__",
    ];
    for (const cell of codeCells) {
      const source = Array.isArray(cell.source)
        ? cell.source.join("")
        : String(cell.source);
      for (const pattern of dangerousPatterns) {
        expect(source).not.toContain(pattern);
      }
    }

    // Clean up downloaded file
    fs.unlinkSync(downloadPath);
  });
});
