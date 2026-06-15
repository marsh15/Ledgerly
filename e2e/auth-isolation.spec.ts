import { expect, test, type Page } from "@playwright/test";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = "Password123!";
const sample = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`;

test("new user can register, log out, log in, refresh, and sees auth errors", async ({ page }) => {
  const user = {
    name: "E2E Auth User",
    email: `e2e-auth-${runId}@example.com`
  };

  await register(page, user);
  await expectDashboard(page);

  await page.reload();
  await expectDashboard(page);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  await login(page, user.email, "WrongPassword123!");
  await expect(page.locator("form").getByText("Email or password did not match an account.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await login(page, user.email, password);
  await expectDashboard(page);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  await register(page, user);
  await expect(page.locator("form").getByText("This email is already registered. Sign in with that password, or use a different email.")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});

test("User A saved transactions are hidden from User B", async ({ page }) => {
  await register(page, {
    name: "E2E User A",
    email: `e2e-a-${runId}@example.com`
  });

  await expectDashboard(page);
  await page.getByLabel("Statement text").fill(sample);
  await page.getByRole("button", { name: "Preview drafts" }).click();
  await expect(page.getByText("1 draft ready")).toBeVisible();
  await page.getByRole("button", { name: "Save reviewed" }).click();
  await expect(page.getByRole("table").getByRole("cell", { name: "STARBUCKS COFFEE MUMBAI", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  await register(page, {
    name: "E2E User B",
    email: `e2e-b-${runId}@example.com`
  });

  await expectDashboard(page);
  await expect(page.getByText("No transactions in this view")).toBeVisible();
  await expect(page.getByRole("table").getByText("STARBUCKS COFFEE MUMBAI")).toHaveCount(0);
});

async function register(page: Page, user: { name: string; email: string }) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function login(page: Page, email: string, inputPassword: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(inputPassword);
  await page.getByRole("button", { name: "Log in" }).click();
}

async function expectDashboard(page: Page) {
  await expect(page.getByText("Searchable, filterable, exportable, and scoped to your private organization.")).toBeVisible();
}
