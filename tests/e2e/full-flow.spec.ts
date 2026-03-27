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

test.describe("Full user flow", () => {
  test("page loads with headline and form elements", async ({ page }) => {
    await page.goto("/");

    // Screenshot: initial page load
    await page.screenshot({
      path: "tests/screenshots/task3-01-page-loaded.png",
      fullPage: true,
    });

    // Verify headline
    await expect(page.getByTestId("headline")).toBeVisible();
    await expect(page.getByTestId("headline")).toContainText("Colab");

    // Verify form elements are present
    await expect(page.getByTestId("api-key-input")).toBeVisible();
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    await expect(page.getByTestId("generate-button")).toBeVisible();

    // Generate button should be disabled initially
    await expect(page.getByTestId("generate-button")).toBeDisabled();
  });

  test("enter API key and upload PDF enables generate button", async ({
    page,
  }) => {
    await page.goto("/");

    // Enter API key
    await page.getByTestId("api-key-input").fill("gsk_test_key_12345");
    await page.screenshot({
      path: "tests/screenshots/task3-02-api-key-entered.png",
    });

    // Upload PDF via file input
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(fixturePdf);
    await page.screenshot({
      path: "tests/screenshots/task3-03-pdf-uploaded.png",
    });

    // Generate button should now be enabled
    await expect(page.getByTestId("generate-button")).toBeEnabled();
  });

  test("clicking generate shows processing view", async ({ page }) => {
    await page.goto("/");

    // Fill form
    await page.getByTestId("api-key-input").fill("gsk_test_key_12345");
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(fixturePdf);

    // Mock API calls to control flow
    await page.route("**/api/extract", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "Mocked paper text about transformers.",
          pageCount: 10,
        }),
      });
    });

    await page.route("**/api/generate", async (route) => {
      // Delay to allow us to capture the processing view
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cells: [
            { type: "markdown", source: "# Test Notebook" },
            { type: "code", source: "print('hello')" },
          ],
          notebookJson: '{"nbformat": 4, "cells": []}',
          filename: "test-notebook.ipynb",
          title: "Test Notebook",
          colabUrl:
            "https://colab.research.google.com/gist/anonymous/abc123",
        }),
      });
    });

    // Click generate
    await page.getByTestId("generate-button").click();

    // Should see processing view
    await expect(page.getByTestId("processing-view")).toBeVisible({
      timeout: 5000,
    });
    await page.screenshot({
      path: "tests/screenshots/task3-04-processing.png",
    });

    // Wait for result view
    await expect(page.getByTestId("result-view")).toBeVisible({
      timeout: 15000,
    });
    await page.screenshot({
      path: "tests/screenshots/task3-05-result.png",
    });

    // Verify result elements
    await expect(page.getByTestId("download-button")).toBeVisible();
  });
});
