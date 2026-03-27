import { test, expect } from "@playwright/test";
import path from "path";

test.describe("PDF drag-and-drop", () => {
  test("upload PDF via file input shows filename", async ({ page }) => {
    await page.goto("/");

    // Screenshot: before upload
    await page.screenshot({
      path: "tests/screenshots/task3-09-before-upload.png",
    });

    // Upload via file input (reliable alternative to drag-drop)
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(
      path.resolve(__dirname, "../../research.pdf")
    );

    // Should show filename in the dropzone
    const dropzone = page.getByTestId("pdf-dropzone");
    await expect(dropzone).toContainText("research.pdf");

    // Screenshot: after upload
    await page.screenshot({
      path: "tests/screenshots/task3-10-after-upload.png",
    });
  });

  test("dropzone shows drag text initially", async ({ page }) => {
    await page.goto("/");

    const dropzone = page.getByTestId("pdf-dropzone");
    await expect(dropzone).toContainText("Drag & drop your PDF");
    await expect(dropzone).toContainText("click to browse");
  });

  test("dropzone displays file size after upload", async ({ page }) => {
    await page.goto("/");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(
      path.resolve(__dirname, "../../research.pdf")
    );

    const dropzone = page.getByTestId("pdf-dropzone");
    // Should show size in MB
    await expect(dropzone).toContainText("MB");
  });
});
