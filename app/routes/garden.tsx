import { CheckCircle2, Droplets, Shield, Sprout } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";
import { useProfiles } from "../lib/profiles";
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
  return { items: [], apiBase: base } satisfies GardenData;
}

export default function Garden() {
  const data = useLoaderData<typeof loader>();
  const { currentProfileId } = useProfiles();
  const [items, setItems] = useState<ReviewItem[]>(data.items ?? []);

  useEffect(() => {
    if (!currentProfileId) return;
    setItems([]);
    void fetchJSON<ReviewItem[]>(`${data.apiBase}/review/queue?profile_id=${currentProfileId}`)
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => setItems([]));
  }, [currentProfileId, data.apiBase]);

  const state = useMemo(() => {
    const count = items.length;
    if (count === 0) return { label: "Garden is flourishing", tone: "success" as const };
    if (count < 4) return { label: `Tend ${count} growth${count === 1 ? "" : "s"}`, tone: "calm" as const };
    return { label: `Water ${count} plants`, tone: "alert" as const };
  }, [items.length]);

  const heroIcon = state.tone === "success" ? (
    <CheckCircle2 className="h-10 w-10 text-emerald-300" />
  ) : state.tone === "calm" ? (
    <Sprout className="h-10 w-10 text-emerald-200" />
  ) : (
    <Droplets className="h-10 w-10 text-cyan-200" />
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 pb-14 pt-8 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="The Greenhouse"
          subtitle="Nurture your garden without revealing the answers."
          action={
            <div className="flex flex-wrap gap-2">
              <OutlineButton to="/library" data-testid="nav-finder">
                Library
              </OutlineButton>
              <Link
                to="/review"
                data-testid="nav-review"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400"
              >
                Tend Now
              </Link>
            </div>
          }
        />

        {!currentProfileId ? (
          <Card className="glass-panel p-6 text-slate-200">
            <p className="text-lg font-semibold text-white">Choose a profile to enter the garden.</p>
            <p className="text-sm text-slate-400">
              Profiles keep your growth progress separate. Create one from the top bar to begin tending.
            </p>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="glass-panel col-span-2 space-y-4 p-6">
              <div className="flex items-center gap-4">
                {heroIcon}
                <div className="space-y-1">
                  <p className="pill bg-emerald-500/15 text-emerald-300">Garden Pulse</p>
                  <h2 className="text-2xl font-semibold text-white">{state.label}</h2>
                  <p className="text-sm text-slate-400">
                    {items.length === 0
                      ? "All growths are healthy."
                      : "Tend now to keep your growths thriving."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/review"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400"
                >
                  Tend Queue
                </Link>
                <Link
                  to="/library"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-100 shadow hover:border-emerald-400"
                >
                  Browse Library
                </Link>
              </div>
            </div>

            <div className="glass-panel space-y-3 p-6">
              <div className="flex items-center gap-2 text-slate-300">
                <Shield className="h-4 w-4" />
                <p className="text-xs uppercase tracking-[0.25em]">Spoiler Safe</p>
              </div>
              <p className="text-sm text-slate-200">
                Values stay hidden here. You will only reveal answers during Tend sessions or inside a dossier.
              </p>
              <p className="text-xs text-slate-500">
                Keys are visible so you know what to expect, but answers stay frosted until you choose to view them.
              </p>
            </div>
          </section>
        )}

        {currentProfileId ? (
          <Card className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Thirsty Growths</h2>
                <p className="text-sm text-slate-400">{items.length} ready to tend.</p>
              </div>
              <span className="pill bg-emerald-500/15 text-emerald-300">Tend</span>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing is thirsty right now.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {items.map((item: ReviewItem) => (
                  <li
                    key={item.id}
                    data-testid={`review-item-${item.id}`}
                    className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur"
                  >
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.key}</p>
                      <div className="rounded-xl border border-white/5 bg-slate-800/70 p-3 text-sm text-slate-400">
                        Hidden until you Tend
                      </div>
                      <p className="text-xs text-slate-500">
                        {item.concept_name} · {item.collection_name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
    </main>
  );
}

