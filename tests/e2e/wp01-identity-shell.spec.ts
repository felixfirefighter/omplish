import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { enterWorkspaceThroughUi, openVisibleProfileMenu, postDemoFromPage } from "./support/wp01-auth";
import { createRegularList, createTask } from "./support/wp03-tasks";
import { installUnreadableProviderCredential } from "./support/provider-key-fixture";

test.beforeEach(async ({ page }) => {
  const id = randomUUID().replaceAll("-", "");
  await page.setExtraHTTPHeaders({
    "x-real-ip": `2001:db8:${id.slice(0, 4)}:${id.slice(4, 8)}:${id.slice(8, 12)}:${id.slice(12, 16)}::1`,
  });
});

test("direct launch runs the guided local onboarding flow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.getByRole("region", { name: "Omplish onboarding" })).toBeVisible();
  const nameInput = page.getByLabel("Your name", { exact: true });
  await expect(nameInput).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Create account|Sign in|Sign out/u)).toHaveCount(0);

  await nameInput.fill("Ekko");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "building discipline" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Let's start" }).click();
  await expect(page).toHaveURL("/today", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem("omplish.profile.username"))).resolves.toBe("Ekko");
});

test("protected routes resume through direct launch without credential routes", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("region", { name: "Omplish onboarding" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
  expect(new URL(page.url()).searchParams.get("resume")).toBe("/settings");

  expect(await postDemoFromPage(page)).toBe(200);
  await page.goto("/settings");
  await expect(page).toHaveURL("/settings", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
});

test("profile menu has settings but no account sign-out action", async ({ page }, testInfo) => {
  await enterWorkspaceThroughUi(page, testInfo);

  const { menu } = await openVisibleProfileMenu(page);
  await expect(menu).toContainText(/Saved on this device/u);
  await expect(menu.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /Sign out|Sign in|Create account/u })).toHaveCount(0);
});

test("launch retry and legacy bootstrap preserve a customized workspace", async ({ page }, testInfo) => {
  await prepareReturningProfile(page, testInfo);
  const list = await createRegularList(page, "Preserved workspace");
  const task = await createTask(page, {
    listId: list.id,
    title: "Keep this task through retry",
    priority: "high",
  });
  const before = await readExport(page);
  let failed = false;
  await page.route("**/api/v1/onboarding", async (route) => {
    if (!failed && route.request().method() === "GET") {
      failed = true;
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    } else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "We couldn’t open your workspace." })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("group", { name: "How you are arriving today" })).toBeVisible({
    timeout: 15_000,
  });
  expect(await postDemoFromPage(page)).toBe(200);
  const after = await readExport(page);
  expect(after.identity).toEqual(before.identity);
  expect(after.tasks).toEqual(before.tasks);
  expect(after.tasks.tasks).toContainEqual(expect.objectContaining({ id: task.id, title: task.title }));
  await assertLaunchAccessibility(page);
});

test("a missing local username resumes the authenticated actor", async ({ page }, testInfo) => {
  await prepareReturningProfile(page, testInfo);
  const before = await readExport(page);
  await page.evaluate(() => localStorage.removeItem("omplish.profile.username"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Returning profile");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("group", { name: "How you are arriving today" })).toBeVisible({
    timeout: 15_000,
  });
  const after = await readExport(page);
  expect(after.identity).toEqual(before.identity);
  expect(after.tasks).toEqual(before.tasks);
});

test("optional AI settings failure allows manual startup and preserves data", async ({ page }, testInfo) => {
  await prepareReturningProfile(page, testInfo);
  const before = await readExport(page);
  const credential = await installUnreadableProviderCredential(before.identity.profile.id);
  try {
    const stored = await credential.read();
    expect((await page.context().request.get("/api/v1/assistant/settings")).status()).toBe(500);
    await page.goto("/");
    await expect(page.getByText(/AI settings could not be read/u)).toBeVisible();
    await expect(page.getByRole("group", { name: "How you are arriving today" })).toBeVisible({
      timeout: 15_000,
    });
    const after = await readExport(page);
    expect(after.identity).toEqual(before.identity);
    expect(after.tasks).toEqual(before.tasks);
    expect(await credential.read()).toEqual(stored);
    const notice = await page.getByText(/AI settings could not be read/u).boundingBox();
    const brand = await page.getByRole("img", { name: "Omplish", exact: true }).boundingBox();
    expect(notice).not.toBeNull();
    expect(brand).not.toBeNull();
    expect(notice!.y).toBeGreaterThanOrEqual(brand!.y + brand!.height);
    await assertLaunchAccessibility(page);
    await page.screenshot({ path: testInfo.outputPath("u01-provider-degraded.png"), fullPage: true });
    await page.getByRole("button", { name: "ready", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page).toHaveURL("/today", { timeout: 15_000 });
    expect(await credential.read()).toEqual(stored);
    await page.goto("/inbox");
    await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();
  } finally {
    await credential.cleanup();
  }
});

test("accepted session cookies survive a lost first bootstrap response body", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let bootstraps = 0;
  await page.route("**/api/v1/demo", async (route) => {
    bootstraps += 1;
    const response = await route.fetch();
    await route.fulfill({ response, body: "{" });
  });
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Preserved first profile");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "We couldn’t open your workspace." })).toBeVisible();
  const before = await readExport(page);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Skip for now" })).toBeVisible({ timeout: 15_000 });
  expect(bootstraps).toBe(1);
  await expect(page.evaluate(() => localStorage.getItem("omplish.profile.username"))).resolves.toBe(
    "Preserved first profile",
  );
  const after = await readExport(page);
  expect(after.identity).toEqual(before.identity);
  expect(after.tasks).toEqual(before.tasks);
  await page.reload();
  await expect(page.getByRole("button", { name: "Skip for now" })).toBeVisible({ timeout: 15_000 });
  expect(bootstraps).toBe(1);
  expect((await readExport(page)).identity).toEqual(before.identity);
});

test("zero-byte legacy HTTP bootstrap resumes without changing data", async ({ page }, testInfo) => {
  await prepareReturningProfile(page, testInfo);
  const before = await readExport(page);
  const headers = { origin: "http://127.0.0.1:3107", "content-type": "application/json" };
  const response = await page.context().request.post("/api/v1/demo", { headers });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ mode: "resumed" });
  for (const data of ["{", "null", " "]) {
    expect((await page.context().request.post("/api/v1/demo", { headers, data })).status()).toBe(400);
  }
  const after = await readExport(page);
  expect(after.identity).toEqual(before.identity);
  expect(after.tasks).toEqual(before.tasks);
});

async function prepareReturningProfile(page: Page, testInfo: TestInfo) {
  await enterWorkspaceThroughUi(page, testInfo);
  const response = await page.context().request.post("/api/v1/onboarding", {
    headers: { origin: "http://127.0.0.1:3107" },
    data: { goals: ["tasks"] },
  });
  expect(response.status()).toBe(200);
  await page.evaluate(() => localStorage.setItem("omplish.profile.username", "Ekko"));
}

async function readExport(page: Page) {
  const response = await page.context().request.get("/api/v1/export");
  expect(response.status()).toBe(200);
  return (await response.json()) as {
    identity: { profile: { id: string } };
    tasks: { tasks: readonly unknown[] };
  };
}

async function assertLaunchAccessibility(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
}
