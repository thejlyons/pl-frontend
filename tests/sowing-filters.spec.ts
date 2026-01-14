import { expect, test, type APIRequestContext } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:18080";

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

async function fetchQueue(api: APIRequestContext, profileId: string) {
  const res = await api.get(`${apiBase}/review/queue?profile_id=${profileId}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as Array<{ key: string }>;
}

test("user can ignore a fact key from the garden queue", async ({ page, request }) => {
  const reset = await request.post(`${apiBase}/test/reset`);
  expect(reset.ok()).toBeTruthy();

  const seedRes = await request.post(`${apiBase}/seeds/countries`);
  expect(seedRes.ok()).toBeTruthy();
  const seed = (await seedRes.json()) as { collection: { id: string } };
  const collectionId = seed.collection.id;

  const profile = await ensureProfile(request);

  const queueBefore = await fetchQueue(request, profile.id);
  expect(queueBefore.some((item) => item.key === "Flag")).toBe(true);

  await page.goto("/garden");
  await page.getByTestId("profile-select").selectOption(profile.id);
  const flagToggle = page.getByTestId(`filter-toggle-${collectionId}-flag`);
  await flagToggle.waitFor({ state: "visible" });
  await flagToggle.click();

  await expect(flagToggle).toContainText(/hidden/i);

  const queueAfter = await fetchQueue(request, profile.id);
  expect(queueAfter.some((item) => item.key === "Flag")).toBe(false);
});
