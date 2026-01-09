import { test, expect, type APIRequestContext } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:18080";

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

async function fetchQueue(api: APIRequestContext, profileId: string) {
  const res = await api.get(`${apiBase}/review/queue?profile_id=${profileId}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as Array<{ id: string }>;
}

test("typed review requires correct answer", async ({ page, request }) => {
  const reset = await request.post(`${apiBase}/test/reset`);
  expect(reset.ok()).toBeTruthy();

  const seedRes = await request.post(`${apiBase}/test/seed`);
  expect(seedRes.ok()).toBeTruthy();

  const profile = await ensureProfile(request);

  await page.goto("/review");
  await page.getByTestId("profile-select").selectOption(profile.id);

  // First item should be France -> Capital (Paris)
  await page.getByTestId("typed-answer-input").fill("Paris");
  await page.getByTestId("check-answer-btn").click();

  await expect(page.getByTestId("rating-good")).toBeVisible();
  await page.getByTestId("rating-good").click();

  // Ensure queue advanced
  const queueAfterFirst = await fetchQueue(request, profile.id);
  expect(queueAfterFirst.length).toBeGreaterThan(0);

  // Next item: force an incorrect answer to surface correction UI
  await page.getByTestId("typed-answer-input").fill("Berlin");
  await page.getByTestId("check-answer-btn").click();
  await expect(page.getByText(/Correct Answer/i)).toBeVisible();
  await expect(page.getByTestId("rating-again")).toBeVisible();
});
