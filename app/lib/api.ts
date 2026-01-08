export function apiBase(): string {
  if (typeof process !== "undefined" && process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  const metaEnv = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } })
    .env;
  const base = metaEnv?.VITE_API_BASE_URL;
  return base || "http://localhost:8080";
}

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const detail = await safeText(res);
    throw new Error(detail || `Request failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
