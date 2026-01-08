import { test, expect, type APIRequestContext } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:18080";

async function fetchQueue(api: APIRequestContext) {
  const res = await api.get(`${apiBase}/review/queue`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as Array<{ id: string }>;
}

test("typed review requires correct answer", async ({ page, request }) => {
  const reset = await request.post(`${apiBase}/test/reset`);
  expect(reset.ok()).toBeTruthy();

  const seedRes = await request.post(`${apiBase}/test/seed`);
  expect(seedRes.ok()).toBeTruthy();

  await page.goto("/review");

  // First item should be France -> Capital (Paris)
  await page.getByTestId("typed-answer-input").fill("Paris");
  await page.getByTestId("check-answer-btn").click();

  await expect(page.getByTestId("rating-recalled")).toBeVisible();
  await page.getByTestId("rating-recalled").click();

  // Ensure queue advanced
  const queueAfterFirst = await fetchQueue(request);
  expect(queueAfterFirst.length).toBeGreaterThan(0);

  // Next item: force an incorrect answer to surface correction UI
  await page.getByTestId("typed-answer-input").fill("Berlin");
  await page.getByTestId("check-answer-btn").click();
  await expect(page.getByText(/Correct Answer/i)).toBeVisible();
  await expect(page.getByTestId("rating-forgot")).toBeVisible();
});
