import { expect, test, type Page } from "@playwright/test";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = "Password123!";
const sample = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`;

test("User A saved transactions are hidden from User B", async ({ page }) => {
  await register(page, {
    name: "E2E User A",
    email: `e2e-a-${runId}@example.com`
  });

  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  await page.getByLabel("Statement text").fill(sample);
  await page.getByRole("button", { name: "Preview drafts" }).click();
  await expect(page.getByText("1 draft ready")).toBeVisible();
  await page.getByRole("button", { name: "Save reviewed" }).click();
  await expect(page.getByText("STARBUCKS COFFEE MUMBAI")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  await register(page, {
    name: "E2E User B",
    email: `e2e-b-${runId}@example.com`
  });

  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  await expect(page.getByText("No transactions in this view")).toBeVisible();
  await expect(page.getByText("STARBUCKS COFFEE MUMBAI")).toHaveCount(0);
});

async function register(page: Page, user: { name: string; email: string }) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}
