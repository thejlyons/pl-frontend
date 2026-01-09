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
  if (!res.ok()) {
    const detail = await res.text();
    throw new Error(`createConcept failed: ${res.status()} ${detail}`);
  }
  return (await res.json()) as { id: string };
}

async function createFact(api: APIRequestContext, conceptId: string, key: string, value: string) {
  const res = await api.post(`${apiBase}/concepts/${conceptId}/facts`, {
    data: { key, value },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string };
}

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

test("user can review a fact and clear the queue", async ({ page, request }) => {
  const reset = await request.post(`${apiBase}/test/reset`);
  expect(reset.ok()).toBeTruthy();

  const profile = await ensureProfile(request);

  const now = Date.now();
  const collectionName = `Review Col ${now}`;
  const conceptName = `Review Concept ${now}`;
  const factKey = `Review Key ${now}`;
  const factValue = `Review Value ${now}`;

  const collection = await createCollection(request, collectionName);
  const concept = await createConcept(request, collection.id, conceptName);
  await createFact(request, concept.id, factKey, factValue);

  const queueBefore = await fetchQueue(request, profile.id);
  expect(queueBefore.length).toBeGreaterThan(0);

  await page.goto("/review");
  await page.getByTestId("profile-select").selectOption(profile.id);
  await page.getByTestId("typed-answer-input").fill(factValue);
  await page.getByTestId("check-answer-btn").click();

  await expect(page.getByTestId("rating-good")).toBeVisible();
  await page.getByTestId("rating-good").click();

  const queueAfter = await fetchQueue(request, profile.id);
  expect(queueAfter).toHaveLength(0);
});
