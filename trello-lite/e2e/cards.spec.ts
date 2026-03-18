import { test, expect } from "./fixtures";

async function setupBoardWithList(page: import("@playwright/test").Page, boardTitle: string, listTitle: string) {
  await page.goto("/boards");
  await page.getByRole("button", { name: "New Board" }).click();
  await page.getByRole("dialog").getByLabel("Title").fill(boardTitle);
  await page.getByRole("dialog").getByRole("button", { name: "Create Board" }).click();
  await expect(page.locator("p", { hasText: boardTitle })).toBeVisible();
  await page.locator("p", { hasText: boardTitle }).click();
  await expect(page).toHaveURL(/\/boards\/.+/);

  // Wait for board page to be fully hydrated before interacting
  await expect(page.getByText("Add a list")).toBeVisible();

  await page.getByText("Add a list").click();
  await page.getByPlaceholder("List title...").fill(listTitle);
  await page.keyboard.press("Enter");

  // Wait for the list column to appear
  await expect(page.getByText(listTitle)).toBeVisible();
  // Wait for "Add a card" to be ready
  await expect(page.getByText("Add a card")).toBeVisible();
}

test.describe("Cards", () => {
  test("adds a card to a list", async ({ page }) => {
    await setupBoardWithList(page, "Card Board 1", "To Do");

    await page.getByText("Add a card").click();
    await page.getByPlaceholder("Card title...").fill("My First Card");
    await page.keyboard.press("Enter");

    await expect(page.getByText("My First Card")).toBeVisible();
  });

  test("cancels adding a card with Escape", async ({ page }) => {
    await setupBoardWithList(page, "Card Board 2", "Backlog");

    await page.getByText("Add a card").click();
    await page.getByPlaceholder("Card title...").fill("Ghost Card");
    await page.keyboard.press("Escape");

    await expect(page.getByText("Ghost Card")).not.toBeVisible();
  });

  test("opens card modal on click", async ({ page }) => {
    await setupBoardWithList(page, "Card Board 3", "Sprint");

    await page.getByText("Add a card").click();
    await page.getByPlaceholder("Card title...").fill("Clickable Card");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Clickable Card")).toBeVisible();

    await page.getByText("Clickable Card").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Card Details")).toBeVisible();
  });

  test("updates card title and description", async ({ page }) => {
    await setupBoardWithList(page, "Card Board 4", "Work");

    await page.getByText("Add a card").click();
    await page.getByPlaceholder("Card title...").fill("Original Title");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Original Title")).toBeVisible();
    await page.getByText("Original Title").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Title").fill("Updated Title");
    await dialog.getByLabel("Description").fill("Some description text");
    await dialog.getByRole("button", { name: "Save" }).click();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Updated Title")).toBeVisible();
  });

  test("sets a due date on a card", async ({ page }) => {
    await setupBoardWithList(page, "Card Board 5", "Tasks");

    await page.getByText("Add a card").click();
    await page.getByPlaceholder("Card title...").fill("Due Date Card");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Due Date Card")).toBeVisible();
    await page.getByText("Due Date Card").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Due Date").fill("2099-12-31");
    await dialog.getByRole("button", { name: "Save" }).click();

    await page.keyboard.press("Escape");
    // Due date badge should appear on the card
    await expect(page.getByText(/12\/31\/2099|2099-12-31/)).toBeVisible();
  });

  test("adds a label to a card", async ({ page }) => {
    await setupBoardWithList(page, "Card Board 6", "Features");

    await page.getByText("Add a card").click();
    await page.getByPlaceholder("Card title...").fill("Labeled Card");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Labeled Card")).toBeVisible();
    await page.getByText("Labeled Card").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Label name").fill("urgent");
    await dialog.getByRole("button", { name: "Add" }).click();

    await expect(dialog.getByText("urgent")).toBeVisible();
  });

  test("removes a label from a card", async ({ page }) => {
    await setupBoardWithList(page, "Card Board 7", "Bugs");

    await page.getByText("Add a card").click();
    await page.getByPlaceholder("Card title...").fill("Label Remove Card");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Label Remove Card")).toBeVisible();
    await page.getByText("Label Remove Card").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Label name").fill("removeme");
    await dialog.getByRole("button", { name: "Add" }).click();
    await expect(dialog.getByText("removeme")).toBeVisible();

    await dialog.getByRole("button", { name: "Remove label removeme" }).click();
    await expect(dialog.getByText("removeme")).not.toBeVisible();
  });

  test("deletes a card from the modal", async ({ page }) => {
    await setupBoardWithList(page, "Card Board 8", "Archive");

    await page.getByText("Add a card").click();
    await page.getByPlaceholder("Card title...").fill("Card To Delete");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Card To Delete")).toBeVisible();

    await page.getByText("Card To Delete").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /delete/i }).click();

    await expect(page.getByText("Card To Delete")).not.toBeVisible();
  });
});
