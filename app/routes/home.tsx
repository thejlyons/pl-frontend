import { useLoaderData } from "react-router";

type HealthPayload = {
  status: string;
  time?: string;
  detail?: string;
};

type LoaderData = HealthPayload;

export async function loader() {
  const apiBase = process.env.API_BASE_URL ?? "http://localhost:8080";

  try {
    const res = await fetch(`${apiBase}/health`);
    if (!res.ok) {
      return {
        status: "unavailable",
        detail: `Backend responded ${res.status}`,
      } satisfies LoaderData;
    }

    const body = (await res.json()) as HealthPayload;
    return { status: body.status ?? "ok", time: body.time } satisfies LoaderData;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Request failed";
    return { status: "unavailable", detail } satisfies LoaderData;
  }
}

export function meta() {
  return [
    { title: "Perennial Health" },
    { name: "description", content: "Backend health status" },
  ];
}

export default function Home() {
  const data = useLoaderData<typeof loader>();

  const isOk = data.status?.toLowerCase() === "ok";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur shadow-xl border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 p-6 space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Backend health
        </p>
        <h1
          className={`text-4xl font-bold ${
            isOk ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {data.status}
        </h1>
        {data.time && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Server time: {data.time}
          </p>
        )}
        {data.detail && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {data.detail}
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This page fetches `/health` from the Go API at startup. Configure a
          different backend with the `API_BASE_URL` environment variable.
        </p>
      </section>
    </main>
  );
}
