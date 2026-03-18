import { test, expect } from "@playwright/test";

const UNIQUE = Date.now();

test.describe("Registration", () => {
  test("registers a new user and redirects to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill(`new-${UNIQUE}@example.com`);
    await page.getByLabel("Password").fill("securepass123");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page).toHaveURL(/login/, { timeout: 8000 });
    await expect(page.getByText("Account created")).toBeVisible();
  });

  test("shows error for duplicate email", async ({ page }) => {
    // Register once
    await page.goto("/register");
    await page.getByLabel("Email").fill(`dup-${UNIQUE}@example.com`);
    await page.getByLabel("Password").fill("pass1");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.waitForURL(/login/);

    // Try to register again with same email
    await page.goto("/register");
    await page.getByLabel("Email").fill(`dup-${UNIQUE}@example.com`);
    await page.getByLabel("Password").fill("pass2");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText(/taken/i)).toBeVisible();
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("pass");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText(/email/i)).toBeVisible();
  });
});

test.describe("Login", () => {
  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpass");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("redirects unauthenticated users from /boards to /login", async ({ page }) => {
    await page.goto("/boards");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});
