import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const now = Date.now();
const apiBase = process.env.API_BASE_URL ?? "http://localhost:18080";
const collectionName = `Collection ${now}`;
const conceptName = `Concept ${now}`;
const factKey = `Key ${now}`;
const factValue = `Value ${now}`;

async function ensureProfile(api: APIRequestContext) {
  const res = await api.get(`${apiBase}/profiles`);
  expect(res.ok()).toBeTruthy();
  const list = (await res.json()) as Array<{ id: string; name: string }>;
  if (Array.isArray(list) && list.length > 0) {
    return list[0];
  }
  const created = await api.post(`${apiBase}/profiles`, {
    data: { name: `Tester ${Date.now()}` },
  });
  expect(created.ok()).toBeTruthy();
  return (await created.json()) as { id: string; name: string };
}

test("user creates a concept and sees it in UI and queue", async ({ page, request }) => {
  const profile = await ensureProfile(request);
  await page.goto("/");
  await page.getByTestId("profile-select").selectOption(profile.id);

  await page.getByTestId("collection-name").fill(collectionName);
  await page.getByTestId("submit-collection").click();
  const collectionTestId = await findDataTestId(
    page,
    "collection-item",
    collectionName
  );
  expect(collectionTestId).not.toBeNull();
  await expect(page.getByTestId(collectionTestId!)).toBeVisible();

  await page.getByTestId("concept-collection").selectOption({ label: collectionName });
  await page.getByTestId("concept-name").fill(conceptName);
  await page.getByTestId("concept-kind").fill("Person");
  await page.getByTestId("submit-concept").click();

  const conceptTestId = await findDataTestId(page, "concept-item", conceptName);
  expect(conceptTestId).not.toBeNull();
  await expect(page.getByTestId(conceptTestId!)).toBeVisible();

  await page.getByTestId("fact-concept").selectOption({ label: conceptName });
  await page.getByTestId("fact-key").fill(factKey);
  await page.getByTestId("fact-value").fill(factValue);
  await page.getByTestId("submit-fact").click();

  await page.getByTestId("nav-garden").click();

  const reviewTestId = await findDataTestId(page, "review-item", factKey);
  expect(reviewTestId).not.toBeNull();
  await expect(page.getByTestId(reviewTestId!)).toBeVisible();
});

async function findDataTestId(page: Page, prefix: string, text: string) {
  const locator = page.locator(`[data-testid^="${prefix}-"]`, { hasText: text });
  try {
    await locator.first().waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    return null;
  }
  const id = await locator.first().getAttribute("data-testid");
  return id ?? null;
}
