import { test, expect } from "./fixtures";

test.describe("Boards", () => {
  test("shows empty state when no boards exist", async ({ page }) => {
    await page.goto("/boards");
    await expect(page.getByText("My Boards")).toBeVisible();
  });

  test("creates a new board and shows it in the list", async ({ page }) => {
    await page.goto("/boards");
    await page.getByRole("button", { name: "New Board" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Title").fill("E2E Test Board");
    await dialog.getByRole("button", { name: "Create Board" }).click();

    await expect(page.getByText("E2E Test Board")).toBeVisible();
  });

  test("navigates into a board on click", async ({ page }) => {
    await page.goto("/boards");

    await page.getByRole("button", { name: "New Board" }).click();
    await page.getByRole("dialog").getByLabel("Title").fill("Nav Test Board");
    await page.getByRole("dialog").getByRole("button", { name: "Create Board" }).click();
    await expect(page.getByText("Nav Test Board")).toBeVisible();

    // Click the board title text (inside the colored card)
    await page.locator("p").filter({ hasText: "Nav Test Board" }).click();
    await expect(page).toHaveURL(/\/boards\/.+/);
    await expect(page.getByText("Nav Test Board")).toBeVisible();
  });

  test("deletes a board", async ({ page }) => {
    await page.goto("/boards");

    await page.getByRole("button", { name: "New Board" }).click();
    await page.getByRole("dialog").getByLabel("Title").fill("Board To Delete");
    await page.getByRole("dialog").getByRole("button", { name: "Create Board" }).click();
    await expect(page.getByText("Board To Delete")).toBeVisible();

    // Scope to the board card using the <p> title, then find the delete button within it
    const boardCard = page.locator("div.relative.rounded-lg").filter({ has: page.locator("p", { hasText: "Board To Delete" }) });
    await boardCard.getByRole("button", { name: "Delete board" }).click();

    await expect(page.locator("p", { hasText: "Board To Delete" })).not.toBeVisible();
  });

  test("sign out from boards page redirects to login", async ({ page }) => {
    await page.goto("/boards");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });
});
