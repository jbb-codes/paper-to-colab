import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const screenshotsDir = path.join(__dirname, "../screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Task 9 – End-to-end wiring and error handling", () => {
  test("page shows the input form in default state", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await expect(apiKeyInput).toBeVisible();

    const dropzone = page.getByTestId("pdf-dropzone");
    await expect(dropzone).toBeVisible();

    const btn = page.getByTestId("generate-button");
    await expect(btn).toBeDisabled();

    await page.screenshot({
      path: path.join(screenshotsDir, "task9-step1-initial-form.png"),
      fullPage: true,
    });
  });

  test("error view component file has correct structure", async ({ page }) => {
    const componentPath = path.join(
      __dirname,
      "../../components/ErrorView.tsx"
    );
    expect(fs.existsSync(componentPath)).toBe(true);

    const content = fs.readFileSync(componentPath, "utf8");
    expect(content).toContain('data-testid="error-view"');
    expect(content).toContain('data-testid="error-message"');
    expect(content).toContain('data-testid="error-reset-button"');
  });

  test("app/page.tsx has state machine logic", async ({ page }) => {
    const pagePath = path.join(__dirname, "../../app/page.tsx");
    const content = fs.readFileSync(pagePath, "utf8");

    // Should have state management
    expect(content).toContain("useState");
    // Should handle different views
    expect(content).toContain("processing");
    expect(content).toContain("result");
    expect(content).toContain("error");
  });

  test("app/page.tsx integrates all required components", async ({ page }) => {
    const pagePath = path.join(__dirname, "../../app/page.tsx");
    const content = fs.readFileSync(pagePath, "utf8");

    expect(content).toContain("ApiKeyInput");
    expect(content).toContain("PdfDropzone");
    expect(content).toContain("GenerateButton");
    expect(content).toContain("ProcessingView");
    expect(content).toContain("ResultView");
    expect(content).toContain("ErrorView");
  });

  test("app/page.tsx calls /api/extract and /api/generate", async ({ page }) => {
    const pagePath = path.join(__dirname, "../../app/page.tsx");
    const content = fs.readFileSync(pagePath, "utf8");

    expect(content).toContain("/api/extract");
    expect(content).toContain("/api/generate");
  });

  test("generate button click triggers processing state", async ({ page }) => {
    await page.goto("/");

    // Fill in API key
    await page.getByTestId("api-key-input").fill("gsk_test_key_invalid");

    // Upload PDF fixture
    const pdfPath = path.join(__dirname, "fixtures/test.pdf");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    // Button should be enabled
    const btn = page.getByTestId("generate-button");
    await expect(btn).toBeEnabled();

    await page.screenshot({
      path: path.join(screenshotsDir, "task9-step2-ready-to-generate.png"),
      fullPage: true,
    });

    // Click generate — this will trigger processing (and eventually fail due to invalid key)
    await btn.click();

    // Processing view should appear
    const processingView = page.getByTestId("processing-view");
    await expect(processingView).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(screenshotsDir, "task9-step3-processing-view.png"),
      fullPage: true,
    });
  });

  test("error state appears when API call fails", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("gsk_invalid_key");

    const pdfPath = path.join(__dirname, "fixtures/test.pdf");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await page.getByTestId("generate-button").click();

    // Wait for error to appear (API call will fail with invalid key)
    const errorView = page.getByTestId("error-view");
    await expect(errorView).toBeVisible({ timeout: 30000 });

    await page.screenshot({
      path: path.join(screenshotsDir, "task9-step4-error-view.png"),
      fullPage: true,
    });

    // Should be able to reset
    const resetBtn = page.getByTestId("error-reset-button");
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Form should be back
    const apiKeyInput = page.getByTestId("api-key-input");
    await expect(apiKeyInput).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotsDir, "task9-step5-after-reset.png"),
      fullPage: true,
    });
  });
});
