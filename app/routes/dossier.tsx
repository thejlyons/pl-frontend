import { Eye, EyeOff, Shield, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";
import { Card, OutlineButton, PageHeader } from "../lib/ui";

export type Concept = {
  id: string;
  collection_id: string;
  name: string;
  kind: string;
};

export type Collection = {
  id: string;
  name: string;
};

export type Fact = {
  id: string;
  concept_id: string;
  key: string;
  value: string;
  input_type: string;
};

type DossierData = {
  concept: Concept | null;
  collection: Collection | null;
  facts: Fact[];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const base = apiBase();
  const [concepts, collections, facts] = await Promise.all([
    fetchJSON<Concept[]>(`${base}/concepts`).catch(() => []),
    fetchJSON<Collection[]>(`${base}/collections`).catch(() => []),
    fetchJSON<Fact[]>(`${base}/facts?concept_id=${params.id ?? ""}`).catch(() => []),
  ]);

  const concept = concepts.find((c) => c.id === params.id) ?? null;
  const collection = concept
    ? collections.find((c) => c.id === concept.collection_id) ?? null
    : null;

  return { concept, collection, facts: Array.isArray(facts) ? facts : [] } satisfies DossierData;
}

export default function Dossier() {
  const { concept, collection, facts } = useLoaderData<typeof loader>();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const headline = useMemo(() => {
    if (!concept) return "Missing concept";
    if (facts.length === 0) return "No facts yet";
    return `${facts.length} fact${facts.length === 1 ? "" : "s"} ready to reveal`;
  }, [concept, facts.length]);

  if (!concept) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[var(--color-glass-bg)] via-slate-900 to-[var(--color-glass-bg)] detached-content text-slate-50">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <PageHeader title="Dossier" subtitle="We couldn't find that concept." />
          <Card className="glass-panel p-6 space-y-3">
            <p className="text-sm text-slate-200">Return to the library to select another concept.</p>
            <OutlineButton to="/library">Back to Library</OutlineButton>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--color-glass-bg)] via-slate-900 to-[var(--color-glass-bg)] detached-content text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title={`${concept.name} Dossier`}
          subtitle="Preview facts in a spoiler-safe panel and reveal intentionally."
          action={<OutlineButton to="/garden">← Garden</OutlineButton>}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <div className="glass-panel col-span-2 space-y-3 p-6">
            <div className="flex items-center gap-3 text-slate-200">
              <Sprout className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="pill bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">Dossier</p>
                <h2 className="text-xl font-semibold text-white">{headline}</h2>
                {collection ? (
                  <p className="text-sm text-slate-400">Collection: {collection.name}</p>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Answers stay frosted until you tap Reveal. Switch facts back to hidden if someone is looking over
              your shoulder.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="pill bg-slate-800/60 text-slate-200 border border-white/10">Anti-spoiler mode</span>
              <span className="pill bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">Per-fact reveal</span>
            </div>
          </div>

          <div className="glass-panel space-y-3 p-6">
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="h-5 w-5" />
              <p className="text-xs uppercase tracking-[0.25em]">Privacy</p>
            </div>
            <p className="text-sm text-slate-200">
              Values are hidden by default. Revealing only affects this view; your review flow stays pristine.
            </p>
            <Link
              to="/review"
              className="glass-button inline-flex w-fit items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold text-emerald-200 hover:text-emerald-100 transition-all duration-200"
            >
              Tend this concept
            </Link>
          </div>
        </section>

        <Card className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Facts</h3>
            <p className="text-sm text-slate-400">Tap Reveal to see an answer.</p>
          </div>

          {facts.length === 0 ? (
            <p className="text-sm text-slate-400">No facts captured yet.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2" data-testid="dossier-facts">
              {facts.map((fact) => {
                const isRevealed = revealed[fact.id] ?? false;
                const isMedia = fact.input_type?.toLowerCase() === "image";
                return (
                  <li
                    key={fact.id}
                    className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl shadow-lg hover:border-white/10 transition-all duration-200"
                    data-testid={`dossier-fact-${fact.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{fact.key}</p>
                        <FactReveal
                          fact={fact}
                          isRevealed={isRevealed}
                          isMedia={isMedia}
                          onToggle={() =>
                            setRevealed((prev) => ({ ...prev, [fact.id]: !isRevealed }))
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setRevealed((prev) => ({ ...prev, [fact.id]: !isRevealed }))}
                        data-testid={`reveal-toggle-${fact.id}`}
                        className="glass-button rounded-2xl px-3 py-2 text-xs font-semibold text-slate-100 hover:text-white transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          {isRevealed ? (
                            <EyeOff className="h-4 w-4" aria-hidden />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden />
                          )}
                          <span>{isRevealed ? "Hide" : "Reveal"}</span>
                        </div>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}

function FactReveal({
  fact,
  isRevealed,
  isMedia,
  onToggle,
}: {
  fact: Fact;
  isRevealed: boolean;
  isMedia: boolean;
  onToggle: () => void;
}) {
  if (isMedia) {
    return (
      <div className="space-y-2">
        <div
          className={`relative overflow-hidden rounded-xl border border-white/10 ${
            isRevealed ? "bg-slate-900" : "bg-slate-800/60"
          }`}
          data-testid={`dossier-fact-value-${fact.id}`}
        >
          {isRevealed ? (
            <img src={fact.value} alt={fact.key} className="h-40 w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-40 w-full items-center justify-center text-sm text-slate-400 backdrop-blur">
              Hidden until reveal
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="glass-button inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-100 hover:text-white transition-all duration-200"
        >
          {isRevealed ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          <span>{isRevealed ? "Hide" : "Reveal"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border border-white/10 p-3 text-sm ${
          isRevealed ? "bg-slate-900 text-slate-100" : "bg-slate-800/70 text-slate-500"
        }`}
        data-testid={`dossier-fact-value-${fact.id}`}
      >
        {isRevealed ? fact.value : "Hidden until reveal"}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="glass-button inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-100 hover:text-white transition-all duration-200"
      >
        {isRevealed ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        <span>{isRevealed ? "Hide" : "Reveal"}</span>
      </button>
    </div>
  );
}
