import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";
import { Card, OutlineButton, PageHeader } from "../lib/ui";

export type ReviewItem = {
  id: string;
  concept_id: string;
  concept_name: string;
  collection_id: string;
  collection_name: string;
  key: string;
  value: string;
  input_type: string;
  next_review_at: string;
};

type GardenData = {
  items: ReviewItem[];
  apiBase: string;
};

export async function loader() {
  const base = apiBase();
  const items = await fetchJSON<ReviewItem[]>(`${base}/review/queue`).catch(() => []);
  return { items: Array.isArray(items) ? items : [], apiBase: base } satisfies GardenData;
}

export default function Garden() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 pb-10 pt-6">
      <PageHeader
        title="Garden"
        subtitle="Check what is due and jump into review."
        action={
          <div className="flex flex-wrap gap-2">
            <OutlineButton to="/" data-testid="nav-finder">
              ← Library
            </OutlineButton>
            <Link
              to="/review"
              data-testid="nav-review"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400"
            >
              Start Review
            </Link>
          </div>
        }
      />

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Queue</h2>
            <p className="text-sm text-slate-400">{data.items.length} items ready.</p>
          </div>
          <span className="pill bg-emerald-500/15 text-emerald-300">Review</span>
        </div>

        {data.items.length === 0 ? (
          <p className="text-sm text-slate-400">No items due.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.items.map((item: ReviewItem) => (
              <li
                key={item.id}
                data-testid={`review-item-${item.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{item.key}</p>
                    <RichValue item={item} />
                    <p className="text-xs text-slate-500">
                      {item.concept_name} · {item.collection_name}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}

function RichValue({ item }: { item: ReviewItem }) {
  const isMedia = item.input_type?.toLowerCase() === "image";

  if (isMedia) {
    const safeSrc = getSafeImageUrl(item.value);

    if (!safeSrc) {
      return <p className="text-sm text-slate-200 break-all">{item.value}</p>;
    }

    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <img src={safeSrc} alt={item.key} className="h-36 w-full object-cover" loading="lazy" />
        </div>
        <p className="text-sm text-slate-200 break-all">{item.value}</p>
      </div>
    );
  }
  return <p className="text-sm text-slate-200 break-all">{item.value}</p>;
}

function getSafeImageUrl(rawUrl: string): string | null {
  try {
    const baseOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
    const url = new URL(rawUrl, baseOrigin);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    const allowedOrigins = new Set<string>();

    if (typeof window !== "undefined") {
      allowedOrigins.add(window.location.origin);
    }

    try {
      const api = apiBase();
      if (api) {
        allowedOrigins.add(new URL(api).origin);
      }
    } catch {
      // ignore invalid api base
    }

    if (!allowedOrigins.has(url.origin)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
