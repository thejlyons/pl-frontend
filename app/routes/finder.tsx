import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";
import { Card, PageHeader } from "../lib/ui";

export type Collection = {
  id: string;
  parent_id?: string | null;
  name: string;
  created_at: string;
};

export type Concept = {
  id: string;
  collection_id: string;
  name: string;
  kind: string;
  created_at: string;
};

export type Fact = {
  id: string;
  concept_id: string;
  key: string;
  value: string;
  next_review_at: string;
  interval_minutes: number;
  created_at: string;
};

type FinderData = {
  collections: Collection[];
  concepts: Concept[];
  apiBase: string;
};

export async function loader() {
  const base = apiBase();
  const [collections, concepts] = await Promise.all([
    fetchJSON<Collection[]>(`${base}/collections`),
    fetchJSON<Concept[]>(`${base}/concepts`),
  ]);

  return {
    collections: collections ?? [],
    concepts: concepts ?? [],
    apiBase: base,
  } satisfies FinderData;
}

export default function Finder() {
  const data = useLoaderData<typeof loader>();
  const initialCollections = data.collections ?? [];
  const initialConcepts = data.concepts ?? [];

  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [concepts, setConcepts] = useState<Concept[]>(initialConcepts);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [activeConceptId, setActiveConceptId] = useState<string>(initialConcepts[0]?.id ?? "");

  const [collectionName, setCollectionName] = useState("");
  const [parentId, setParentId] = useState("");

  const [conceptName, setConceptName] = useState("");
  const [conceptKind, setConceptKind] = useState("");
  const [conceptCollection, setConceptCollection] = useState(initialCollections[0]?.id ?? "");

  const [factKey, setFactKey] = useState("");
  const [factValue, setFactValue] = useState("");
  const [factConcept, setFactConcept] = useState(initialConcepts[0]?.id ?? "");

  const createRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeConceptId) {
      void loadFacts(activeConceptId);
      setFactConcept(activeConceptId);
    } else {
      setFacts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConceptId]);

  async function refreshCollectionsAndConcepts() {
    const [cols, cons] = await Promise.all([
      fetchJSON<Collection[]>(`${data.apiBase}/collections`),
      fetchJSON<Concept[]>(`${data.apiBase}/concepts`),
    ]);
    const nextCollections = Array.isArray(cols) ? cols : [];
    const nextConcepts = Array.isArray(cons) ? cons : [];
    setCollections(nextCollections);
    setConcepts(nextConcepts);
    return { collections: nextCollections, concepts: nextConcepts };
  }

  async function loadFacts(conceptId: string) {
    try {
      const list = await fetchJSON<Fact[]>(
        `${data.apiBase}/facts?concept_id=${conceptId}`
      );
      setFacts(Array.isArray(list) ? list : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load facts");
    }
  }

  async function handleCreateCollection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const payload = {
        name: collectionName,
        parent_id: parentId || undefined,
      };
      const created = await fetchJSON<Collection>(`${data.apiBase}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMessage(`Created collection ${created.name}`);
      setCollectionName("");
      setParentId("");
      await refreshCollectionsAndConcepts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create collection");
    }
  }

  async function handleCreateConcept(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const payload = {
        collection_id: conceptCollection || collections?.[0]?.id,
        name: conceptName,
        kind: conceptKind,
      };
      const created = await fetchJSON<Concept>(`${data.apiBase}/concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMessage(`Created concept ${created.name}`);
      setConceptName("");
      setConceptKind("");
      setConceptCollection(payload.collection_id || "");
      setActiveConceptId(created.id);
      setFactConcept(created.id);
      await refreshCollectionsAndConcepts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create concept");
    }
  }

  async function handleCreateFact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const conceptId = factConcept || concepts?.[0]?.id;
      if (!conceptId) {
        setMessage("Select a concept first");
        return;
      }
      const payload = {
        key: factKey,
        value: factValue,
      };
      const created = await fetchJSON<Fact>(
        `${data.apiBase}/concepts/${conceptId}/facts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      setMessage(`Created fact ${created.key}`);
      setFactKey("");
      setFactValue("");
      setFactConcept(conceptId);
      await loadFacts(conceptId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create fact");
    }
  }

  async function handleDeleteConcept(id: string) {
    const target = concepts.find((c) => c.id === id);
    const name = target?.name ?? "concept";
    if (!window.confirm(`Delete ${name}? This will also remove its facts.`)) return;
    try {
      setActiveConceptId("");
      setFactConcept("");
      setFacts([]);
      const res = await fetch(`${data.apiBase}/concepts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Unable to delete concept");
      }
      const nextState = await refreshCollectionsAndConcepts();
      const nextActive = activeConceptId === id ? nextState.concepts[0]?.id ?? "" : activeConceptId;
      setFacts([]);
      setActiveConceptId(nextActive);
      setFactConcept(nextActive);
      if (nextActive) {
        await loadFacts(nextActive);
      } else {
        setFacts([]);
      }
      setFacts((prev) => prev.filter((f) => f.concept_id !== id));
      setMessage(`Deleted ${name}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete concept");
    }
  }

  async function handleDeleteFact(id: string) {
    const target = facts.find((f) => f.id === id);
    const label = target?.key ?? "fact";
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      const res = await fetch(`${data.apiBase}/facts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Unable to delete fact");
      }
      if (activeConceptId) {
        await loadFacts(activeConceptId);
      } else {
        setFacts([]);
      }
      setMessage(`Deleted ${label}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete fact");
    }
  }

  function scrollToCreate() {
    createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 pb-10 pt-6">
      <PageHeader
        title="Library"
        subtitle="Capture concepts, attach facts, prune what no longer grows."
        action={
          <button
            type="button"
            onClick={scrollToCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
          >
            <span className="text-lg" aria-hidden>
              +
            </span>
            Add
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <span className="pill bg-slate-800 text-slate-200">Mobile-first</span>
        <span className="pill bg-emerald-500/15 text-emerald-300">Dark mode</span>
        <Link to="/garden" data-testid="nav-garden" className="underline decoration-emerald-400 underline-offset-4">
          View Garden
        </Link>
        <Link to="/review" className="underline decoration-emerald-400 underline-offset-4">
          Start Review
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      <div ref={createRef} className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Collection</p>
            <h2 className="text-xl font-semibold text-white">New Collection</h2>
          </div>
          <form onSubmit={handleCreateCollection} className="space-y-3">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Name
              <input
                data-testid="collection-name"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
                placeholder="Botany"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Parent (optional)
              <select
                data-testid="collection-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
              >
                <option value="">None</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              data-testid="submit-collection"
              type="submit"
              className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400"
            >
              Create Collection
            </button>
          </form>
        </Card>

        <Card className="p-5 space-y-4 lg:col-span-2">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Concept & Fact</p>
            <h2 className="text-xl font-semibold text-white">New Concept</h2>
          </div>
          <form onSubmit={handleCreateConcept} className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Collection
              <select
                data-testid="concept-collection"
                value={conceptCollection}
                onChange={(e) => setConceptCollection(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
                required
              >
                <option value="" disabled>
                  Choose a collection
                </option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Name
              <input
                data-testid="concept-name"
                value={conceptName}
                onChange={(e) => setConceptName(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
                placeholder="Fern"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Kind
              <input
                data-testid="concept-kind"
                value={conceptKind}
                onChange={(e) => setConceptKind(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
                placeholder="Plant"
                required
              />
            </label>
            <div className="flex items-end justify-end">
              <button
                data-testid="submit-concept"
                type="submit"
                className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400 md:w-auto"
              >
                Create Concept
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New Fact</h3>
            </div>
            <form onSubmit={handleCreateFact} className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm text-slate-200 md:col-span-1">
                Concept
                <select
                  data-testid="fact-concept"
                  value={factConcept}
                  onChange={(e) => {
                    setFactConcept(e.target.value);
                    setActiveConceptId(e.target.value);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
                  required
                >
                  <option value="" disabled>
                    Choose a concept
                  </option>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200 md:col-span-1">
                Key
                <input
                  data-testid="fact-key"
                  value={factKey}
                  onChange={(e) => setFactKey(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
                  placeholder="Image URL"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200 md:col-span-2">
                Value
                <input
                  data-testid="fact-value"
                  value={factValue}
                  onChange={(e) => setFactValue(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
                  placeholder="https://..."
                  required
                />
              </label>
              <div className="md:col-span-4 flex justify-end">
                <button
                  data-testid="submit-fact"
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400"
                >
                  Create Fact
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Collections</h3>
              <p className="text-sm text-slate-400">Tap a concept to load its facts.</p>
            </div>
          </div>
          <ul className="space-y-2" data-testid="collections-list">
            {collections.map((c) => (
              <li
                key={c.id}
                data-testid={`collection-item-${c.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-slate-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{c.name}</span>
                  {c.parent_id ? (
                    <span className="pill bg-slate-800 text-slate-300">Nested</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Concepts</h3>
              <p className="text-sm text-slate-400">Select to view facts or prune with the trash.</p>
            </div>
          </div>
          <ul className="space-y-2" data-testid="concepts-list">
            {concepts.map((c) => {
              const isActive = activeConceptId === c.id;
              return (
                <li
                  key={c.id}
                  data-testid={`concept-item-${c.id}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    isActive
                      ? "border-emerald-500/60 bg-emerald-950"
                      : "border-slate-800 bg-slate-900/60 hover:border-emerald-600/40"
                  }`}
                >
                  <button
                    type="button"
                    className="flex flex-1 flex-col items-start text-left"
                    onClick={() => setActiveConceptId(c.id)}
                  >
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="text-sm text-slate-400">{c.kind}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="pill bg-slate-800 text-slate-200">{c.kind}</span>
                    <button
                      type="button"
                      data-testid={`delete-concept-${c.id}`}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200 hover:border-rose-400 hover:text-rose-200"
                      onClick={() => handleDeleteConcept(c.id)}
                      aria-label={`Delete ${c.name}`}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Facts</h3>
            <p className="text-sm text-slate-400">Showing facts for the selected concept.</p>
          </div>
          {activeConceptId ? (
            <span className="pill bg-emerald-500/15 text-emerald-300">{facts.length} items</span>
          ) : null}
        </div>

        {activeConceptId ? (
          <ul
            key={activeConceptId}
            className="grid gap-3 md:grid-cols-2"
            data-testid="facts-list"
          >
            {facts.map((f) => (
              <li
                key={f.id}
                data-testid={`fact-item-${f.id}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{f.key}</p>
                    <FactValue fact={f} />
                  </div>
                  <button
                    type="button"
                    data-testid={`delete-fact-${f.id}`}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200 hover:border-rose-400 hover:text-rose-200"
                    onClick={() => handleDeleteFact(f.id)}
                    aria-label={`Delete fact ${f.key}`}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Select a concept to load facts.</p>
        )}
      </Card>
    </main>
  );
}

function FactValue({ fact }: { fact: Fact }) {
  const isMedia = /image|flag|map/i.test(fact.key);
  if (isMedia) {
    return (
      <div className="mt-2 space-y-2">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <img
            src={fact.value}
            alt={fact.key}
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        </div>
        <p className="text-sm text-slate-300 break-words">{fact.value}</p>
      </div>
    );
  }
  return <p className="text-sm text-slate-200 break-words">{fact.value}</p>;
}
