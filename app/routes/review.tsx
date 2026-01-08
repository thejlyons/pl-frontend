import { useState } from "react";
import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";
import { Card, OutlineButton, PageHeader } from "../lib/ui";
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 pb-12 pt-6 text-slate-100">
      <PageHeader
        title="Review"
        subtitle="Reinforce concepts and see rich media answers."
        action={<OutlineButton to="/garden">← Queue</OutlineButton>}
      />

      <Card className="space-y-5 p-5">
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/60 p-5 shadow-inner">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Prompt</p>
          <p className="mt-2 text-xl font-semibold text-white">
            What is the <span className="text-emerald-300">{current.key}</span> of
            <span className="text-emerald-300"> {current.concept_name}</span>?
          </p>
          <p className="text-sm text-slate-400">Collection: {current.collection_name}</p>
        </div>

        {showAnswer ? (
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Answer</p>
              <AnswerValue item={current} />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="rating-forgot"
                disabled={isSubmitting}
                onClick={() => handleRating("forgot")}
                className="flex-1 rounded-lg border border-rose-700 bg-rose-900/60 px-4 py-3 text-rose-100 hover:border-rose-500 disabled:opacity-60"
              >
                Forgot
              </button>
              <button
                type="button"
                data-testid="rating-recalled"
                disabled={isSubmitting}
                onClick={() => handleRating("recalled")}
                className="flex-1 rounded-lg border border-emerald-700 bg-emerald-900/60 px-4 py-3 text-emerald-100 hover:border-emerald-500 disabled:opacity-60"
              >
                Recalled
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <button
              type="button"
              data-testid="show-answer-btn"
              onClick={() => setShowAnswer(true)}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400"
            >
              Show Answer
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}
      </Card>
    </main>
  );
}

function GardenTended() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 pb-12 pt-6 text-slate-100">
      <Card className="w-full space-y-6 p-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">All clear</p>
        <h1 className="text-3xl font-semibold text-white">Garden Tended</h1>
        <p className="text-slate-300">
          Your garden is tended. Come back later to help it grow.
        </p>
        <Link
          to="/"
          className="inline-flex justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400"
        >
          Return to Collections
        </Link>
      </Card>
    </main>
  );
}

function AnswerValue({ item }: { item: ReviewItem }) {
  const isMedia = /image|flag|map/i.test(item.key);
  if (isMedia) {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <img src={item.value} alt={item.key} className="h-56 w-full object-cover" loading="lazy" />
        </div>
        <p className="text-sm text-slate-200 break-words">{item.value}</p>
      </div>
    );
  }
  return <p className="text-xl font-semibold text-white break-words">{item.value}</p>;
}
