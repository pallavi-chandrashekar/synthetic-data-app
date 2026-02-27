import { test, expect } from "@playwright/test";
import {
  MOCK_JSON_RESPONSE,
  MOCK_JSON_RESPONSE_REGENERATED,
  MOCK_CSV_RESPONSE,
  MOCK_CUSTOM_PROMPT_RESPONSE,
} from "./fixtures/mock-data.js";

const PAUSE = 3000; // visible pause between scenarios (ms)
const API_DELAY = 2000; // fake spinner delay so it appears in the video

/**
 * Inject a styled overlay banner at the top-center of the page.
 */
async function showOverlay(page, stepNum, title) {
  await page.evaluate(
    ({ stepNum, title }) => {
      const el = document.createElement("div");
      el.id = "__demo-overlay";
      el.textContent = `Step ${stepNum}: ${title}`;
      Object.assign(el.style, {
        position: "fixed",
        top: "0",
        left: "50%",
        transform: "translateX(-50%) translateY(-100%)",
        zIndex: "999999",
        padding: "18px 48px",
        borderRadius: "0 0 16px 16px",
        background: "linear-gradient(135deg, #1a237e 0%, #4a148c 100%)",
        color: "#fff",
        fontSize: "32px",
        fontWeight: "700",
        fontFamily: "system-ui, sans-serif",
        letterSpacing: "0.5px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)",
        whiteSpace: "nowrap",
      });
      document.body.appendChild(el);
      // Trigger slide-in
      requestAnimationFrame(() => {
        el.style.transform = "translateX(-50%) translateY(0)";
      });
    },
    { stepNum, title }
  );
  // Wait for animation to complete
  await page.waitForTimeout(500);
}

/**
 * Remove the overlay banner with a slide-out animation.
 */
async function hideOverlay(page) {
  await page.evaluate(() => {
    const el = document.getElementById("__demo-overlay");
    if (el) {
      el.style.transform = "translateX(-50%) translateY(-100%)";
      setTimeout(() => el.remove(), 400);
    }
  });
  await page.waitForTimeout(500);
}

/**
 * Single continuous test that walks through every key feature of the
 * Synthetic Data Generator app. Route interception mocks all backend
 * calls so no real API key is required.
 */
test("Video walkthrough — all 16 scenarios", async ({ page }) => {
  // ── Track how many /generate-data calls have been made ──
  let generateCallCount = 0;

  // ── Route interception: mock POST /generate-data ──
  await page.route("**/generate-data", async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.continue();

    const body = JSON.parse(req.postData());
    generateCallCount++;

    // Artificial delay so the spinner is visible in the video
    await new Promise((r) => setTimeout(r, API_DELAY));

    // Error scenario
    if (body.prompt?.includes("FORCE_ERROR")) {
      return route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Upstream model unavailable" }),
      });
    }

    // CSV format
    if (body.format === "csv") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CSV_RESPONSE),
      });
    }

    // Custom prompt (sales-related)
    if (body.prompt?.toLowerCase().includes("sales")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CUSTOM_PROMPT_RESPONSE),
      });
    }

    // Re-generate: serve different data on the second call for the same prompt
    if (generateCallCount > 2) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_JSON_RESPONSE_REGENERATED),
      });
    }

    // Default JSON
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_JSON_RESPONSE),
    });
  });

  // Clear localStorage so history starts fresh
  await page.addInitScript(() => localStorage.clear());

  // ─────────────────────────────────────────────
  // 1 · App loads
  // ─────────────────────────────────────────────
  await page.goto("/");
  await expect(page.getByText("Synthetic Data Generator")).toBeVisible();
  await showOverlay(page, 1, "App Loads");
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 2 · Dark mode toggle
  // ─────────────────────────────────────────────
  await showOverlay(page, 2, "Dark Mode Toggle");
  const themeToggle = page.getByRole("button", { name: /Toggle theme/ });
  // Highlight the button so viewers can see it
  await themeToggle.evaluate((el) => {
    el.style.outline = "3px solid #ff6b6b";
    el.style.outlineOffset = "4px";
    el.style.transition = "outline 0.3s ease";
  });
  await page.waitForTimeout(800);
  await themeToggle.click();
  await page.waitForTimeout(PAUSE);
  await themeToggle.click(); // toggle back to light
  await page.waitForTimeout(PAUSE);
  // Remove highlight
  await themeToggle.evaluate((el) => {
    el.style.outline = "none";
  });
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 3 · Sample prompt chip
  // ─────────────────────────────────────────────
  await showOverlay(page, 3, "Sample Prompt");
  const firstChip = page.getByRole("button", {
    name: /Generate 50 fake customer profiles/,
  });
  await firstChip.click();
  const promptField = page.getByRole("textbox", { name: "Prompt" });
  await expect(promptField).toHaveValue(
    /Generate 50 fake customer profiles/
  );
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 4 · Generate JSON data
  // ─────────────────────────────────────────────
  await showOverlay(page, 4, "Generate JSON");
  const generateBtn = page.getByRole("button", { name: /Generate/i }).first();
  await generateBtn.click();
  // Wait for spinner then table
  await expect(page.locator(".MuiSkeleton-root").first()).toBeVisible();
  await expect(page.getByText("Generated Data")).toBeVisible({ timeout: 15000 });
  // Success snackbar
  await expect(page.getByText("Data generated successfully")).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 5 · Copy to clipboard
  // ─────────────────────────────────────────────
  await showOverlay(page, 5, "Copy to Clipboard");
  // Grant clipboard permissions so the copy succeeds
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const copyBtn = page.getByRole("button", { name: /Copy/ });
  await copyBtn.click();
  await expect(page.getByText("Copied to clipboard")).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 6 · Download JSON
  // ─────────────────────────────────────────────
  await showOverlay(page, 6, "Download JSON");
  const [jsonDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Download JSON/i }).click(),
  ]);
  expect(jsonDownload.suggestedFilename()).toBe("synthetic_data.json");
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 7 · Switch to CSV + generate
  // ─────────────────────────────────────────────
  await showOverlay(page, 7, "Switch to CSV");
  // The format Select shows "JSON" text — target the specific combobox
  const formatSelect = page.getByText("JSON", { exact: true });
  await formatSelect.click();
  await page.getByRole("option", { name: "CSV" }).click();
  await page.waitForTimeout(500);
  await generateBtn.click();
  await expect(page.locator(".MuiSkeleton-root").first()).toBeVisible();
  await expect(page.getByText("Generated Data")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 8 · Download CSV
  // ─────────────────────────────────────────────
  await showOverlay(page, 8, "Download CSV");
  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Download CSV/i }).click(),
  ]);
  expect(csvDownload.suggestedFilename()).toBe("synthetic_data.csv");
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 9 · Keyboard shortcut (Ctrl+Enter)
  // ─────────────────────────────────────────────
  await showOverlay(page, 9, "Keyboard Shortcut");
  // Switch back to JSON — the select now shows "CSV"
  await page.getByText("CSV", { exact: true }).first().click();
  await page.getByRole("option", { name: "JSON" }).click();
  await page.waitForTimeout(300);

  // Clear prompt and type a custom one
  await promptField.click();
  await promptField.fill("Generate 10 sales records with product, quantity, revenue, and date");
  await page.waitForTimeout(500);
  await promptField.press("Control+Enter");
  await expect(page.locator(".MuiSkeleton-root").first()).toBeVisible();
  await expect(page.getByText("Generated Data")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 10 · Prompt history
  // ─────────────────────────────────────────────
  const historySection = page.getByText("Prompt History");
  await historySection.scrollIntoViewIfNeeded();
  await showOverlay(page, 10, "Prompt History");
  await page.waitForTimeout(500);
  // We should have at least 2 history items by now
  // (customer profiles prompt + sales records prompt)
  const historyItems = page.locator("text=Generate 50 fake customer profiles");
  await expect(historyItems.first()).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 11 · Restore from history
  // ─────────────────────────────────────────────
  await showOverlay(page, 11, "Restore Prompt");
  // Click the customer profiles history item to restore it
  const historyButton = page
    .getByRole("button", { name: /Generate 50 fake customer profiles/ })
    .first();
  await historyButton.click();
  await expect(promptField).toHaveValue(
    /Generate 50 fake customer profiles/
  );
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 12 · Delete history item
  // ─────────────────────────────────────────────
  await showOverlay(page, 12, "Delete History Item");
  // Each history row has a delete icon button — click the first one
  const deleteIcons = page.locator('[data-testid="DeleteIcon"]');
  await deleteIcons.first().click();
  // Confirm in the dialog
  await expect(page.getByText("Delete Prompt")).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(2000);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 13 · Undo deletion
  // ─────────────────────────────────────────────
  // Click UNDO immediately before the snackbar auto-dismisses
  const undoBtn = page.getByRole("button", { name: "UNDO" });
  await undoBtn.click();
  await showOverlay(page, 13, "Undo Deletion");
  await expect(page.getByText(/restored/i)).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 14 · Re-generate
  // ─────────────────────────────────────────────
  await showOverlay(page, 14, "Re-generate");
  // Make sure the prompt field has content
  await promptField.fill(
    "Generate 50 fake customer profiles with fields: name, email, age, country"
  );
  await page.waitForTimeout(300);
  const regenBtn = page.getByRole("button", { name: /Re-generate/ });
  await regenBtn.click();
  await expect(page.locator(".MuiSkeleton-root").first()).toBeVisible();
  await expect(page.getByText("Generated Data")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Data regenerated")).toBeVisible();
  // Verify different data appeared (name from regenerated mock)
  await expect(page.getByText("Zara Patel")).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 15 · Clear history
  // ─────────────────────────────────────────────
  await historySection.scrollIntoViewIfNeeded();
  await showOverlay(page, 15, "Clear History");
  const clearBtn = page.getByRole("button", { name: /Clear History/i });
  await clearBtn.click();
  await expect(
    page.getByText("No prompts yet. Generate something to save it.")
  ).toBeVisible();
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);

  // ─────────────────────────────────────────────
  // 16 · Error scenario
  // ─────────────────────────────────────────────
  await showOverlay(page, 16, "Error Handling");
  await promptField.fill("FORCE_ERROR — trigger backend failure");
  await page.waitForTimeout(300);
  await generateBtn.click();
  await expect(page.locator(".MuiSkeleton-root").first()).toBeVisible();
  await expect(page.getByText("Upstream model unavailable")).toBeVisible({
    timeout: 15000,
  });
  await page.waitForTimeout(PAUSE);
  await hideOverlay(page);
});
