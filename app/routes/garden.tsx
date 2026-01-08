import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";

export type ReviewItem = {
  id: string;
  concept_id: string;
  concept_name: string;
  collection_id: string;
  collection_name: string;
  key: string;
  value: string;
  next_review_at: string;
};

type GardenData = {
  items: ReviewItem[];
  apiBase: string;
};

export async function loader() {
  const base = apiBase();
  const items = await fetchJSON<ReviewItem[]>(`${base}/review/queue`);
  return { items, apiBase: base } satisfies GardenData;
}

export default function Garden() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Garden</h1>
          <p className="text-sm text-slate-600">Facts due for review.</p>
        </div>
        <Link to="/" data-testid="nav-finder" className="underline">
          Back to Finder
        </Link>
      </header>

      <section className="rounded border p-4 space-y-2">
        {data.items.length === 0 ? (
          <p className="text-sm text-slate-600">No items due.</p>
        ) : (
          <ul className="space-y-2">
            {data.items.map((item: ReviewItem) => (
              <li
                key={item.id}
                data-testid={`review-item-${item.id}`}
                className="border rounded p-3"
              >
                <div className="font-semibold">{item.key}</div>
                <div className="text-sm text-slate-700">{item.value}</div>
                <div className="text-xs text-slate-500">
                  {item.concept_name} · {item.collection_name}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
