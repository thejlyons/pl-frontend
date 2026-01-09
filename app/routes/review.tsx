import { useEffect, useState } from "react";
import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";
import { Card, OutlineButton, PageHeader } from "../lib/ui";
import { useProfiles } from "../lib/profiles";
import type { ReviewItem } from "./garden";

type LoaderData = {
  items: ReviewItem[];
  apiBase: string;
};

export async function loader() {
  const base = apiBase();
  return { items: [], apiBase: base } satisfies LoaderData;
}

export default function ReviewPlayer() {
  const data = useLoaderData<typeof loader>();
  const { currentProfileId } = useProfiles();
  const [queue, setQueue] = useState<ReviewItem[]>(data.items ?? []);
  const [showAnswer, setShowAnswer] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0];
  const isMedia = current?.input_type?.toLowerCase() === "image";

  useEffect(() => {
    if (!currentProfileId) return;
    setQueue([]);
    void fetchJSON<ReviewItem[]>(`${data.apiBase}/review/queue?profile_id=${currentProfileId}`)
      .then((items) => setQueue(items ?? []))
      .catch(() => setQueue([]));
  }, [data.apiBase, currentProfileId]);

  useEffect(() => {
    setShowAnswer(false);
    setTypedAnswer("");
    setResult("idle");
    setError(null);
  }, [current?.id]);

  async function handleRating(rating: "again" | "hard" | "good" | "easy") {
    if (!current) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await fetchJSON(`${data.apiBase}/facts/${current.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, profile_id: currentProfileId }),
      });
      setQueue((prev) => prev.slice(1));
      setShowAnswer(false);
      setTypedAnswer("");
      setResult("idle");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unable to submit rating";
      setError(detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckAnswer() {
    if (!current) return;
    const guess = typedAnswer.trim().toLowerCase();
    const answer = current.value.trim().toLowerCase();

    if (!guess) {
      setError("Type an answer first");
      return;
    }

    if (guess === answer) {
      setResult("correct");
      setShowAnswer(true);
    } else {
      setResult("incorrect");
      setShowAnswer(true);
    }
  }

  if (!currentProfileId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 pb-12 pt-6 text-slate-100">
        <Card className="w-full p-6 text-center">Select or create a profile to start reviewing.</Card>
      </main>
    );
  }

  if (!current) {
    return <GardenTended />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 pb-12 pt-6 text-slate-100">
      <PageHeader
        title="Review"
        subtitle="Type your answer to prove recall; media hints included."
        action={<OutlineButton to="/garden">← Queue</OutlineButton>}
      />

      <Card className="space-y-5 p-5">
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/60 p-5 shadow-inner">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Prompt</p>
          <div className="mt-2 space-y-2 text-xl font-semibold text-white">
            {isMedia ? (
              <p>
                Which concept has this <span className="text-emerald-300">{current.key.toLowerCase()}</span>?
              </p>
            ) : (
              <p>
                What is the <span className="text-emerald-300">{current.key}</span> of
                <span className="text-emerald-300"> {current.concept_name}</span>?
              </p>
            )}
            <p className="text-sm font-normal text-slate-400">Collection: {current.collection_name}</p>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          {isMedia ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Visual</p>
              <AnswerValue item={current} />
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCheckAnswer();
            }}
            className="space-y-3"
          >
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Your Answer
              <input
                data-testid="typed-answer-input"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                className={`rounded-xl border px-3 py-3 text-base font-semibold text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none ${
                  result === "incorrect" ? "border-rose-500" : "border-slate-700"
                } ${result === "incorrect" ? "animate-shake" : ""}`}
                placeholder={isMedia ? "Type the concept name" : "Type it..."}
                disabled={isSubmitting}
                autoFocus
              />
            </label>
            <button
              type="submit"
              data-testid="check-answer-btn"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400 disabled:opacity-60"
            >
              Check Answer
            </button>
            {result === "correct" ? (
              <p className="text-sm font-semibold text-emerald-300">Nice! Choose a rating to record it.</p>
            ) : null}
          </form>

          {(showAnswer || result !== "idle") && (
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Correct Answer</p>
              <AnswerValue item={current} />
            </div>
          )}

          {(showAnswer || result !== "idle") && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <button
                type="button"
                data-testid="rating-again"
                disabled={isSubmitting}
                onClick={() => handleRating("again")}
                className="rounded-lg border border-rose-700 bg-rose-900/60 px-4 py-3 text-rose-100 hover:border-rose-500 disabled:opacity-60"
              >
                Again
              </button>
              <button
                type="button"
                data-testid="rating-hard"
                disabled={isSubmitting}
                onClick={() => handleRating("hard")}
                className="rounded-lg border border-amber-700 bg-amber-900/60 px-4 py-3 text-amber-100 hover:border-amber-500 disabled:opacity-60"
              >
                Hard
              </button>
              <button
                type="button"
                data-testid="rating-good"
                disabled={isSubmitting}
                onClick={() => handleRating("good")}
                className="rounded-lg border border-emerald-700 bg-emerald-900/60 px-4 py-3 text-emerald-100 hover:border-emerald-500 disabled:opacity-60"
              >
                Good
              </button>
              <button
                type="button"
                data-testid="rating-easy"
                disabled={isSubmitting}
                onClick={() => handleRating("easy")}
                className="rounded-lg border border-cyan-700 bg-cyan-900/60 px-4 py-3 text-cyan-100 hover:border-cyan-500 disabled:opacity-60"
              >
                Easy
              </button>
            </div>
          )}
        </div>

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

function getSafeImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2048) return null;

  const lower = trimmed.toLowerCase();
  const isHttp = lower.startsWith("http://") || lower.startsWith("https://");
  const isRelativePath = trimmed.startsWith("/");

  if (!isHttp && !isRelativePath) {
    return null;
  }

  return trimmed;
}

function AnswerValue({ item }: { item: ReviewItem }) {
  const isMedia = item.input_type?.toLowerCase() === "image";
  const safeImageUrl = isMedia ? getSafeImageUrl(item.value) : null;

  if (isMedia && safeImageUrl) {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <img
            src={safeImageUrl}
            alt={item.key}
            className="h-56 w-full object-cover"
            loading="lazy"
          />
        </div>
        <p className="text-sm text-slate-200 break-all">{item.value}</p>
      </div>
    );
  }

  return <p className="text-xl font-semibold text-white break-words break-all">{item.value}</p>;
}
