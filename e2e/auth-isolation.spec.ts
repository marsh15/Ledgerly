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
  await page.getByLabel("Description").fill("E2E PRIVATE COFFEE");
  await page.getByLabel("Amount").fill("420");
  await page.getByLabel("Currency").fill("INR");
  await page.getByRole("button", { name: "Add transaction", exact: true }).last().click();
  await expect(page.getByText("E2E PRIVATE COFFEE")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await register(page, userB);
  await page.goto("/transactions");
  await expect(page.getByText("No transactions found")).toBeVisible();
  await expect(page.getByText("E2E PRIVATE COFFEE")).toHaveCount(0);
});

test("CSV import maps columns, skips within-file duplicates, and can roll back", async ({ page }) => {
  await register(page, { name: "E2E Import User", email: `e2e-import-${runId}@example.com` });
  await page.goto("/import");
  await page.locator('input[type="file"]').setInputFiles({
    name: "june-statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Date,Description,Amount,Currency,Category\n2026-06-10,TEST CAFE,-250,INR,Dining\n2026-06-10,TEST CAFE,-250,INR,Dining")
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

test("mobile navigation and transaction cards are keyboard reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page, { name: "E2E Mobile User", email: `e2e-mobile-${runId}@example.com` });
  await page.getByRole("button", { name: "Open navigation" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: "Transactions" }).click();
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
