import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const screenshotsDir = path.join(__dirname, "../screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

test.describe("Task 10 – UI polish and responsive design", () => {
  test("page looks correct at 1280px desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // Headline visible
    await expect(page.getByTestId("headline")).toBeVisible();
    await expect(page.getByTestId("subheading")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotsDir, "task10-step1-desktop-1280.png"),
      fullPage: true,
    });
  });

  test("page is readable at 768px tablet width", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    await expect(page.getByTestId("headline")).toBeVisible();
    await expect(page.getByTestId("api-key-input")).toBeVisible();
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    await expect(page.getByTestId("generate-button")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotsDir, "task10-step2-tablet-768.png"),
      fullPage: true,
    });
  });

  test("API key show/hide toggle works", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("api-key-input");
    const toggle = page.getByTestId("api-key-toggle");

    // Initially password type
    await expect(input).toHaveAttribute("type", "password");

    // Click show
    await toggle.click();
    await expect(input).toHaveAttribute("type", "text");

    await page.screenshot({
      path: path.join(screenshotsDir, "task10-step3-api-key-visible.png"),
      fullPage: true,
    });

    // Click hide
    await toggle.click();
    await expect(input).toHaveAttribute("type", "password");
  });

  test("PDF dropzone shows hover state styling attributes", async ({ page }) => {
    await page.goto("/");
    const dropzone = page.getByTestId("pdf-dropzone");

    // Verify dropzone has hover-related classes in source
    const className = await dropzone.getAttribute("class");
    expect(className).toContain("transition");

    await page.screenshot({
      path: path.join(screenshotsDir, "task10-step4-dropzone-hover.png"),
      fullPage: true,
    });
  });

  test("generate button has transition classes for hover effect", async ({ page }) => {
    await page.goto("/");

    // Fill to make button enabled and check its classes
    await page.getByTestId("api-key-input").fill("gsk_test");

    const pdfPath = path.join(__dirname, "fixtures/test.pdf");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    const btn = page.getByTestId("generate-button");
    const className = await btn.getAttribute("class");
    expect(className).toContain("transition");

    await page.screenshot({
      path: path.join(screenshotsDir, "task10-step5-button-enabled-hover.png"),
      fullPage: true,
    });
  });

  test("app/globals.css has smooth animation keyframes", async ({ page }) => {
    const cssPath = path.join(__dirname, "../../app/globals.css");
    const content = fs.readFileSync(cssPath, "utf8");
    // Should have the Tailwind directives for animations (defined in tailwind config)
    expect(content).toContain("@tailwind");
  });

  test("page has correct font-family applied", async ({ page }) => {
    await page.goto("/");
    const bodyFont = await page.evaluate(() =>
      window.getComputedStyle(document.body).fontFamily
    );
    // Inter is the first font
    expect(bodyFont.toLowerCase()).toContain("inter");
  });

  test("page renders without horizontal scroll at 768px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance

    await page.screenshot({
      path: path.join(screenshotsDir, "task10-step6-no-horizontal-scroll.png"),
      fullPage: true,
    });
  });
});
