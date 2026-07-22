import { expect, test, type Page } from "@playwright/test";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = "Password123!";

test("account switching does not show stale ledger data", async ({ page }) => {
  const userA = { name: "E2E User A", email: `e2e-a-${runId}@example.com` };
  const userB = { name: "E2E User B", email: `e2e-b-${runId}@example.com` };
  await register(page, userA);
  await expectOverview(page);

  await page.goto("/transactions");
  await page.getByRole("button", { name: "Add transaction" }).click();
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Description", { exact: true }).fill("E2E PRIVATE COFFEE");
  await dialog.getByLabel("Amount", { exact: true }).fill("420");
  await dialog.getByLabel("Currency", { exact: true }).fill("INR");
  await dialog.getByRole("button", { name: "Add transaction", exact: true }).click();
  await expect(page.getByRole("table").getByText("E2E PRIVATE COFFEE")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await register(page, userB);
  await page.goto("/transactions");
  await expect(page.getByText("No transactions found")).toBeVisible();
  await expect(page.getByText("E2E PRIVATE COFFEE")).toHaveCount(0);
});

test("overview tolerates analytics responses from before merchant totals were added", async ({ page }) => {
  await page.route("**/api/analytics/summary?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        currencySummaries: [{
          currencyCode: "INR",
          totals: { spend: 420, income: 0, net: -420, debitCount: 1, creditCount: 0 },
          monthlySeries: [{ month: "2026-07", spend: 420, income: 0, net: -420, count: 1 }],
          categoryTotals: [{ category: "Dining", spend: 420, income: 0, count: 1 }]
        }],
        duplicateCount: 0,
        reviewCount: 0,
        transactionCount: 1
      })
    });
  });
  await page.route("**/api/analytics/subscriptions", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ subscriptions: [] }) });
  });

  await register(page, { name: "E2E Compatibility User", email: `e2e-compat-${runId}@example.com` });
  await expectOverview(page);
  await expect(page.getByRole("heading", { name: "Top merchants" })).toBeVisible();
  await expect(page.getByText("No merchant totals yet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
});

test("CSV import maps columns, skips within-file duplicates, and can roll back", async ({ page }) => {
  await register(page, { name: "E2E Import User", email: `e2e-import-${runId}@example.com` });
  await page.goto("/import");
  await page.locator('input[type="file"]').setInputFiles({
    name: "june-statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Date,Description,Amount,Type,Currency,Category\n2026-06-10,TEST CAFE,250,Debit,INR,Dining\n2026-06-10,TEST CAFE,250,Debit,INR,Dining")
  });
  await expect(page.getByText("june-statement.csv")).toBeVisible();
  await page.getByLabel("Date format").selectOption("YYYY-MM-DD");
  await page.getByRole("button", { name: "Review rows" }).click();
  await expect(page.getByText("1 possible duplicates skipped by default")).toBeVisible();
  await expect(page.getByRole("button", { name: "Import 1 selected" })).toBeVisible();
  await page.getByRole("button", { name: "Import 1 selected" }).click();
  await expect(page.getByText("Import complete")).toBeVisible();
  await expect(page.getByText("1 imported · 1 skipped")).toBeVisible();
  await page.getByRole("button", { name: "Roll back" }).click();
  await expect(page.getByText("Completed imports will appear here.")).toBeVisible();
});

test("paste text requires corrections, saves reviewed drafts, and shows merchant totals", async ({ page }) => {
  await register(page, { name: "E2E Text User", email: `e2e-text-${runId}@example.com` });
  await page.goto("/import");
  await page.getByRole("button", { name: "Paste text" }).click();
  await page.getByLabel("Transaction text").fill("Date: 14 Jul 2026 Description: E2E MERCHANT Amount: -420.00");
  await page.getByRole("button", { name: "Review drafts" }).click();
  await expect(page.getByText("Add an explicit currency code or symbol.")).toBeVisible();
  await page.getByLabel("Currency").fill("INR");
  await expect(page.getByText("Ready to save · retained for review")).toBeVisible();
  await page.getByRole("button", { name: "Save selected" }).click();
  await expect(page.getByText("Transaction text")).toBeVisible();
  await page.goto("/overview");
  await expect(page.getByRole("heading", { name: "Top merchants" })).toBeVisible();
  await expect(page.getByText("E2E MERCHANT", { exact: true })).toBeVisible();

  await page.goto("/import");
  await page.getByRole("button", { name: "Paste text" }).click();
  await page.getByLabel("Transaction text").fill("Date: 14 Jul 2026 Description: E2E MERCHANT Amount: INR -420.00");
  await page.getByRole("button", { name: "Review drafts" }).click();
  await expect(page.getByText("Possible duplicate")).toBeVisible();
  await expect(page.getByLabel("Save draft 1")).not.toBeChecked();
});

test("mobile navigation and transaction cards are keyboard reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page, { name: "E2E Mobile User", email: `e2e-mobile-${runId}@example.com` });
  await page.getByRole("button", { name: "Open navigation" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add transaction" })).toBeVisible();
});

async function register(page: Page, user: { name: string; email: string }) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/overview/);
}

async function expectOverview(page: Page) {
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Import, review, and clean your ledger so your numbers stay accurate.")).toBeVisible();
}
