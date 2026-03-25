import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const screenshotsDir = path.join(__dirname, "../screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Task 3 – Main page UI: API key input + PDF upload form", () => {
  test("page loads with dark background and headline", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({
      path: path.join(screenshotsDir, "task3-step1-page-load.png"),
      fullPage: true,
    });

    // Check dark background
    const bg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // #0a0a0a = rgb(10, 10, 10)
    expect(bg).toBe("rgb(10, 10, 10)");
  });

  test("headline and subheading are visible", async ({ page }) => {
    await page.goto("/");
    const headline = page.getByTestId("headline");
    await expect(headline).toBeVisible();
    const subheading = page.getByTestId("subheading");
    await expect(subheading).toBeVisible();
  });

  test("API key input is present and is password type", async ({ page }) => {
    await page.goto("/");
    const apiKeyInput = page.getByTestId("api-key-input");
    await expect(apiKeyInput).toBeVisible();
    expect(await apiKeyInput.getAttribute("type")).toBe("password");
  });

  test("PDF upload zone is present", async ({ page }) => {
    await page.goto("/");
    const dropzone = page.getByTestId("pdf-dropzone");
    await expect(dropzone).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "task3-step2-form-visible.png"),
      fullPage: true,
    });
  });

  test("Generate button is disabled when fields are empty", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByTestId("generate-button");
    await expect(btn).toBeDisabled();
  });

  test("Generate button stays disabled with only API key filled", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("api-key-input").fill("gsk_test_key");
    const btn = page.getByTestId("generate-button");
    await expect(btn).toBeDisabled();
  });

  test("Generate button becomes enabled when both API key and PDF are provided", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("api-key-input").fill("gsk_test_key");

    // Simulate file upload via the hidden input
    const fileInput = page.getByTestId("pdf-file-input");
    const pdfPath = path.join(__dirname, "fixtures/test.pdf");

    // Create a minimal PDF fixture for the test
    if (!fs.existsSync(path.join(__dirname, "fixtures"))) {
      fs.mkdirSync(path.join(__dirname, "fixtures"), { recursive: true });
    }
    if (!fs.existsSync(pdfPath)) {
      // Minimal valid PDF bytes
      fs.writeFileSync(
        pdfPath,
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
      );
    }

    await fileInput.setInputFiles(pdfPath);

    const btn = page.getByTestId("generate-button");
    await expect(btn).toBeEnabled();

    await page.screenshot({
      path: path.join(screenshotsDir, "task3-step3-button-enabled.png"),
      fullPage: true,
    });
  });
});
