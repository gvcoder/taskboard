import { test as base } from "@playwright/test";
import path from "path";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

// All tests using this fixture start already authenticated
export const test = base.extend({
  storageState: AUTH_FILE,
});

export { expect } from "@playwright/test";
