import { test, expect, type APIRequestContext } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:18080";

async function createCollection(api: APIRequestContext, name: string) {
  const res = await api.post(`${apiBase}/collections`, {
    data: { name },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string };
}

async function createConcept(api: APIRequestContext, collectionId: string, name: string) {
  const res = await api.post(`${apiBase}/concepts`, {
    data: { collection_id: collectionId, name, kind: "Test" },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string };
}

async function createFact(api: APIRequestContext, conceptId: string, key: string, value: string) {
  const res = await api.post(`${apiBase}/concepts/${conceptId}/facts`, {
    data: { key, value },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string };
}

async function fetchQueue(api: APIRequestContext) {
  const res = await api.get(`${apiBase}/review/queue`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as Array<{ id: string }>;
}

test("user can review a fact and clear the queue", async ({ page, request }) => {
  const now = Date.now();
  const collectionName = `Review Col ${now}`;
  const conceptName = `Review Concept ${now}`;
  const factKey = `Review Key ${now}`;
  const factValue = `Review Value ${now}`;

  const collection = await createCollection(request, collectionName);
  const concept = await createConcept(request, collection.id, conceptName);
  await createFact(request, concept.id, factKey, factValue);

  const queueBefore = await fetchQueue(request);
  expect(queueBefore.length).toBeGreaterThan(0);

  await page.goto("/review");
  await page.getByTestId("show-answer-btn").click();
  await page.getByTestId("rating-recalled").click();

  await expect(page.getByText("Your garden is tended.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to Collections" })).toBeVisible();

  const queueAfter = await fetchQueue(request);
  expect(queueAfter).toHaveLength(0);
});
