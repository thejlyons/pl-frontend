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

type Subscription = {
  profile_id: string;
  collection_id: string;
  ignored_keys?: string[];
};

type GardenData = {
  items: ReviewItem[];
  apiBase: string;
};

export async function loader() {
  const base = apiBase();
  return { items: [], apiBase: base } satisfies GardenData;
}

function slugifyKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function Garden() {
  const data = useLoaderData<typeof loader>();
  const { currentProfileId } = useProfiles();
  const [items, setItems] = useState<ReviewItem[]>(data.items ?? []);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [pendingIgnored, setPendingIgnored] = useState<Record<string, Set<string>>>({});
  const [collectionNames, setCollectionNames] = useState<Record<string, string>>({});
  const [savingFilter, setSavingFilter] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProfileId) return;
    setItems([]);
    setMessage(null);
    void Promise.all([
      fetchJSON<ReviewItem[]>(`${data.apiBase}/review/queue?profile_id=${currentProfileId}`),
      fetchJSON<Subscription[]>(`${data.apiBase}/subscriptions?profile_id=${currentProfileId}`).catch(() => []),
    ])
      .then(([list, subs]) => {
        const queueItems = Array.isArray(list) ? list : [];
        setItems(queueItems);
        setSubscriptions(Array.isArray(subs) ? subs : []);
        setCollectionNames((prev) => {
          const next = { ...prev };
          queueItems.forEach((item) => {
            if (!next[item.collection_id]) {
              next[item.collection_id] = item.collection_name;
            }
          });
          return next;
        });
      })
      .catch((err) => {
        setItems([]);
        setSubscriptions([]);
        setMessage(err instanceof Error ? err.message : "Could not load queue");
      });
  }, [currentProfileId, data.apiBase]);

  const state = useMemo(() => {
    const count = items.length;
    if (count === 0) return { label: "Garden is flourishing", tone: "success" as const };
    if (count < 4) return { label: `Tend ${count} growth${count === 1 ? "" : "s"}`, tone: "calm" as const };
    return { label: `Water ${count} plants`, tone: "alert" as const };
  }, [items.length]);

  const subscriptionIgnored = useMemo(() => {
    const map: Record<string, string[]> = {};
    subscriptions.forEach((sub) => {
      map[sub.collection_id] = sub.ignored_keys ?? [];
    });
    return map;
  }, [subscriptions]);

  const keysByCollection = useMemo(() => {
    const map = new Map<string, Set<string>>();

    items.forEach((item) => {
      const existing = map.get(item.collection_id) ?? new Set<string>();
      existing.add(item.key);
      map.set(item.collection_id, existing);
    });

    Object.entries(subscriptionIgnored).forEach(([collectionId, ignored]) => {
      const existing = map.get(collectionId) ?? new Set<string>();
      ignored.forEach((k) => existing.add(k));
      map.set(collectionId, existing);
    });

    return map;
  }, [items, subscriptionIgnored]);

  const filterCollections = useMemo(() => Array.from(keysByCollection.entries()), [keysByCollection]);

  async function toggleKey(collectionId: string, keyName: string, include: boolean) {
    if (!currentProfileId) return;
    const nextIgnored = new Set(subscriptionIgnored[collectionId] ?? []);
    if (include) {
      nextIgnored.delete(keyName);
    } else {
      nextIgnored.add(keyName);
    }
    const cacheKey = `${collectionId}-${keyName}`;
    setSavingFilter(cacheKey);
    setMessage(null);

    // Optimistically reflect the toggle in UI so labels flip immediately.
    setPendingIgnored((prev) => ({ ...prev, [collectionId]: nextIgnored }));

    try {
      const updated = await fetchJSON<Subscription>(`${data.apiBase}/subscriptions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: currentProfileId,
          collection_id: collectionId,
          ignored_keys: Array.from(nextIgnored),
        }),
      });

      setSubscriptions((prev) => {
        const filtered = prev.filter(
          (sub) => !(sub.collection_id === collectionId && sub.profile_id === currentProfileId)
        );
        return [...filtered, updated];
      });
      setPendingIgnored((prev) => {
        const next = { ...prev };
        delete next[collectionId];
        return next;
      });

      const refreshed = await fetchJSON<ReviewItem[]>(
        `${data.apiBase}/review/queue?profile_id=${currentProfileId}`
      );
      const queueItems = Array.isArray(refreshed) ? refreshed : [];
      setItems(queueItems);
      setCollectionNames((prev) => {
        const next = { ...prev };
        queueItems.forEach((item) => {
          if (!next[item.collection_id]) {
            next[item.collection_id] = item.collection_name;
          }
        });
        return next;
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update filters");
      setPendingIgnored((prev) => {
        const next = { ...prev };
        delete next[collectionId];
        return next;
      });
    } finally {
      setSavingFilter(null);
    }
  }

  const heroIcon = state.tone === "success" ? (
    <CheckCircle2 className="h-10 w-10 text-emerald-300" />
  ) : state.tone === "calm" ? (
    <Sprout className="h-10 w-10 text-emerald-200" />
  ) : (
    <Droplets className="h-10 w-10 text-cyan-200" />
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--color-glass-bg)] via-slate-900 to-[var(--color-glass-bg)] detached-content text-slate-50">
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
                className="glass-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-900 hover:shadow-xl transition-all duration-200"
              >
                Tend Now
              </Link>
            </div>
          }
        />

        {message ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-rose-700/40 bg-rose-900/20 backdrop-blur-xl px-4 py-3 text-sm text-rose-100">
            {message}
          </div>
        ) : null}

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
                  className="glass-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-900 hover:shadow-xl transition-all duration-200"
                >
                  Tend Queue
                </Link>
                <Link
                  to="/library"
                  className="glass-button inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-100 hover:text-white transition-all duration-200"
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
          <Card className="glass-panel space-y-4 p-6" data-testid="sowing-filters">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Sowing Filters</h2>
                <p className="text-sm text-slate-400">Hide fact keys you do not want to review.</p>
              </div>
              <span className="pill bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">Per collection</span>
            </div>

            {filterCollections.length === 0 ? (
              <p className="text-sm text-slate-400">Filters appear once your subscriptions sprout.</p>
            ) : (
              <div className="space-y-3">
                {filterCollections.map(([collectionId, keys]) => {
                  const ignored = new Set(pendingIgnored[collectionId] ?? subscriptionIgnored[collectionId] ?? []);
                  const label = collectionNames[collectionId] ?? "Collection";
                  return (
                    <div
                      key={collectionId}
                      className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{label}</p>
                          <p className="text-xs text-slate-500">Toggle keys to include in the queue.</p>
                        </div>
                        <span className="pill bg-slate-800 text-slate-200">{ignored.size} ignored</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {[...keys].sort().map((key) => {
                          const ignoredKey = ignored.has(key);
                          const cacheKey = `${collectionId}-${key}`;
                          const testId = `filter-toggle-${collectionId}-${slugifyKey(key)}`;
                          return (
                            <label
                              key={key}
                              data-testid={testId}
                              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200 cursor-pointer ${
                                ignoredKey
                                  ? "border-slate-700/50 bg-slate-900/50 text-slate-400"
                                  : "border-emerald-500/50 bg-emerald-500/15 text-emerald-100 shadow-sm shadow-emerald-500/10"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={!ignoredKey}
                                disabled={savingFilter === cacheKey}
                                onChange={(e) => void toggleKey(collectionId, key, e.target.checked)}
                              />
                              <span className="font-semibold">{key}</span>
                              <span className="text-xs uppercase tracking-[0.2em]">
                                {ignoredKey ? "hidden" : "active"}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ) : null}

        {currentProfileId ? (
          <Card className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Thirsty Growths</h2>
                <p className="text-sm text-slate-400">{items.length} ready to tend.</p>
              </div>
              <span className="pill bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">Tend</span>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing is thirsty right now.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {items.map((item: ReviewItem) => (
                  <li
                    key={item.id}
                    data-testid={`review-item-${item.id}`}
                    className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl shadow-lg hover:border-white/10 transition-all duration-200"
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

