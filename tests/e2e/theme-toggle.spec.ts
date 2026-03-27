import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
  test("toggle switches between dark and light theme", async ({ page }) => {
    // Force dark color scheme so initial theme is deterministic
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    // Screenshot: initial theme (should be dark)
    await page.screenshot({
      path: "tests/screenshots/task3-06-theme-dark.png",
    });

    // Verify initial dark theme
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Click theme toggle
    await page.getByTestId("theme-toggle").click();

    // Should switch to light theme
    await expect(html).toHaveAttribute("data-theme", "light");
    await page.screenshot({
      path: "tests/screenshots/task3-07-theme-light.png",
    });

    // Toggle back to dark
    await page.getByTestId("theme-toggle").click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: "tests/screenshots/task3-08-theme-dark-again.png",
    });
  });
});
