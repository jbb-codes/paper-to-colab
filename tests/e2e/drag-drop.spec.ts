import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const fixtureDir = path.join(__dirname, "fixtures");
const fixturePdf = path.join(fixtureDir, "test.pdf");

test.beforeAll(() => {
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }
  if (!fs.existsSync(fixturePdf)) {
    fs.writeFileSync(
      fixturePdf,
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    );
  }
});

test.describe("PDF drag-and-drop", () => {
  test("upload PDF via file input shows filename", async ({ page }) => {
    await page.goto("/");

    // Screenshot: before upload
    await page.screenshot({
      path: "tests/screenshots/task3-09-before-upload.png",
    });

    // Upload via file input (reliable alternative to drag-drop)
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(fixturePdf);

    // Should show filename in the dropzone
    const dropzone = page.getByTestId("pdf-dropzone");
    await expect(dropzone).toContainText("test.pdf");

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
    await fileInput.setInputFiles(fixturePdf);

    const dropzone = page.getByTestId("pdf-dropzone");
    // Should show size in MB
    await expect(dropzone).toContainText("MB");
  });
});
