import { test as setup, expect } from "@playwright/test";
import path from "path";

export const TEST_EMAIL = "e2e@example.com";
export const TEST_PASSWORD = "e2epassword123";
export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("create test account and save session", async ({ page }) => {
  // Register the test user (ignore error if already exists)
  await page.goto("/register");
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();

  // Either redirected to /login (new account) or shown "email taken" (already exists)
  // Either way, log in
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/boards", { timeout: 10000 });

  // Save the authenticated session
  await page.context().storageState({ path: AUTH_FILE });
});
