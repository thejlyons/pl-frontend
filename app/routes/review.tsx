import { useState } from "react";
import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";
import type { ReviewItem } from "./garden";

type LoaderData = {
  items: ReviewItem[];
  apiBase: string;
};

export async function loader() {
  const base = apiBase();
  try {
    const items = await fetchJSON<ReviewItem[]>(`${base}/review/queue`);
    return { items, apiBase: base } satisfies LoaderData;
  } catch (error) {
    console.error("Failed to load review queue:", error);
    return { items: [], apiBase: base } satisfies LoaderData;
  }
}

export default function ReviewPlayer() {
  const data = useLoaderData<typeof loader>();
  const [queue, setQueue] = useState<ReviewItem[]>(data.items ?? []);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0];

  async function handleRating(rating: "forgot" | "recalled") {
    if (!current) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await fetchJSON(`${data.apiBase}/facts/${current.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      setQueue((prev) => prev.slice(1));
      setShowAnswer(false);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unable to submit rating";
      setError(detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!current) {
    return <GardenTended />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 text-slate-900 p-4">
      <section className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl bg-white/90 backdrop-blur shadow-xl border border-emerald-100 p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Review</p>
            <h1 className="text-3xl font-semibold">Tend the Garden</h1>
          </div>
          <Link to="/garden" className="text-sm underline text-emerald-700">
            View Queue
          </Link>
        </header>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 space-y-3">
          <p className="text-lg font-semibold">
            What is the <span className="text-emerald-700">{current.key}</span> of
            <span className="text-emerald-700"> {current.concept_name}</span>?
          </p>
          <p className="text-sm text-slate-600">Collection: {current.collection_name}</p>
        </div>

        {showAnswer ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div>
              <p className="text-sm text-slate-500">Answer</p>
              <p className="text-xl font-semibold text-slate-900">{current.value}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="rating-forgot"
                disabled={isSubmitting}
                onClick={() => handleRating("forgot")}
                className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                Forgot
              </button>
              <button
                type="button"
                data-testid="rating-recalled"
                disabled={isSubmitting}
                onClick={() => handleRating("recalled")}
                className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              >
                Recalled
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <button
              type="button"
              data-testid="show-answer-btn"
              onClick={() => setShowAnswer(true)}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-white shadow hover:bg-emerald-700"
            >
              Show Answer
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-700">{error}</p>}
      </section>
    </main>
  );
}

function GardenTended() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 text-slate-900 p-4 flex items-center justify-center">
      <section className="w-full max-w-xl space-y-6 rounded-3xl bg-white/90 backdrop-blur shadow-xl border border-emerald-100 p-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">All clear</p>
        <h1 className="text-3xl font-semibold">Garden Tended</h1>
        <p className="text-slate-700">
          Your garden is tended. Come back later to help it grow.
        </p>
        <Link
          to="/"
          className="inline-flex justify-center rounded-lg bg-emerald-600 px-4 py-3 text-white shadow hover:bg-emerald-700"
        >
          Return to Collections
        </Link>
      </section>
    </main>
  );
}
