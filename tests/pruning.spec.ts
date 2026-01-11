import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:18080";

const now = Date.now();
const collectionName = `Prune Collection ${now}`;
const conceptName = `Prune Concept ${now}`;
const factKey = `Prune Key ${now}`;
const factValue = `Prune Value ${now}`;

async function ensureProfile(api: APIRequestContext) {
  const res = await api.get(`${apiBase}/profiles`);
  expect(res.ok()).toBeTruthy();
  const list = (await res.json()) as Array<{ id: string; name: string }>;
  if (Array.isArray(list) && list.length > 0) {
    return list[0];
  }
  const created = await api.post(`${apiBase}/profiles`, { data: { name: `Tester ${Date.now()}` } });
  expect(created.ok()).toBeTruthy();
  return (await created.json()) as { id: string; name: string };
}

test("user can delete a concept and cascade its facts", async ({ page, request }) => {
  const profile = await ensureProfile(request);
  await page.goto("/library");
  await page.getByTestId("profile-select").selectOption(profile.id);

  await page.getByTestId("collection-name").fill(collectionName);
  await page.getByTestId("submit-collection").click();

  await page.getByTestId("concept-collection").selectOption({ label: collectionName });
  await page.getByTestId("concept-name").fill(conceptName);
  await page.getByTestId("concept-kind").fill("Prunable");
  await page.getByTestId("submit-concept").click();

  await page.getByTestId("fact-concept").selectOption({ label: conceptName });
  await page.getByTestId("fact-key").fill(factKey);
  await page.getByTestId("fact-value").fill(factValue);
  await page.getByTestId("submit-fact").click();

  const conceptTestId = await findDataTestId(page, "concept-item", conceptName);
  expect(conceptTestId).not.toBeNull();

  const conceptId = conceptTestId!.replace("concept-item-", "");
  const deleteButton = page.getByTestId(`delete-concept-${conceptId}`);
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();

  await expect(page.getByTestId(conceptTestId!)).toHaveCount(0);

  const factsResponse = await request.get(`${apiBase}/facts`);
  expect(factsResponse.ok()).toBeTruthy();
  const facts = (await factsResponse.json()) as Array<{ key: string }>;
  expect(facts.some((fact) => fact.key === factKey)).toBe(false);
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
