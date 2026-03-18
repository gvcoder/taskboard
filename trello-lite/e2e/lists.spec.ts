import { test, expect } from "./fixtures";

async function createAndOpenBoard(page: import("@playwright/test").Page, title: string) {
  await page.goto("/boards");
  await page.getByRole("button", { name: "New Board" }).click();
  await page.getByRole("dialog").getByLabel("Title").fill(title);
  await page.getByRole("dialog").getByRole("button", { name: "Create Board" }).click();
  await expect(page.locator("p", { hasText: title })).toBeVisible();
  await page.locator("p", { hasText: title }).click();
  await expect(page).toHaveURL(/\/boards\/.+/);
  // Wait for the board page to be fully hydrated
  await expect(page.getByText("Add a list")).toBeVisible();
}

test.describe("Lists", () => {
  test("adds a new list to a board", async ({ page }) => {
    await createAndOpenBoard(page, "List Test Board");

    await page.getByText("Add a list").click();
    await page.getByPlaceholder("List title...").fill("To Do");
    await page.keyboard.press("Enter");

    await expect(page.getByText("To Do")).toBeVisible();
  });

  test("adds multiple lists", async ({ page }) => {
    await createAndOpenBoard(page, "Multi List Board");

    for (const name of ["Backlog", "In Progress", "Done"]) {
      await page.getByText("Add a list").click();
      await page.getByPlaceholder("List title...").fill(name);
      await page.keyboard.press("Enter");
      await expect(page.getByText(name)).toBeVisible();
    }
  });

  test("cancels adding a list with Escape", async ({ page }) => {
    await createAndOpenBoard(page, "Cancel List Board");

    await page.getByText("Add a list").click();
    await page.getByPlaceholder("List title...").fill("Should Not Appear");
    await page.keyboard.press("Escape");

    await expect(page.getByText("Should Not Appear")).not.toBeVisible();
    await expect(page.getByText("Add a list")).toBeVisible();
  });

  test("deletes a list", async ({ page }) => {
    await createAndOpenBoard(page, "Delete List Board");

    await page.getByText("Add a list").click();
    await page.getByPlaceholder("List title...").fill("Temp List");
    await page.keyboard.press("Enter");

    // Wait for the list to appear before trying to delete it
    await expect(page.getByText("Temp List")).toBeVisible();

    await page.getByRole("button", { name: "Delete list" }).click();
    await expect(page.getByText("Temp List")).not.toBeVisible();
  });

  test("back button returns to boards page", async ({ page }) => {
    await createAndOpenBoard(page, "Back Nav Board");
    // The back button is the first button in the header (ArrowLeft icon, no text)
    await page.locator("header button").first().click();
    await expect(page).toHaveURL("/boards");
  });
});
