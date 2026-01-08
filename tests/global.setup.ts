import { request } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:18080";

async function resetTestData() {
  const context = await request.newContext();
  try {
    const res = await context.post(`${apiBase}/test/reset`);
    if (!res.ok()) {
      const detail = await res.text();
      throw new Error(`Reset failed (${res.status}): ${detail}`);
    }
  } finally {
    await context.dispose();
  }
}

export default async function globalSetup() {
  await resetTestData();
}
