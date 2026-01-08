import { useEffect, useState, type FormEvent } from "react";
import { Link, useLoaderData } from "react-router";

import { apiBase, fetchJSON } from "../lib/api";

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

  const [collectionName, setCollectionName] = useState("");
  const [parentId, setParentId] = useState("");

  const [conceptName, setConceptName] = useState("");
  const [conceptKind, setConceptKind] = useState("");
  const [conceptCollection, setConceptCollection] = useState("");

  const [factKey, setFactKey] = useState("");
  const [factValue, setFactValue] = useState("");
  const [factConcept, setFactConcept] = useState("");

  const selectedConcept = factConcept || concepts?.[0]?.id || "";

  useEffect(() => {
    if (selectedConcept) {
      loadFacts(selectedConcept);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConcept]);

  async function refreshCollectionsAndConcepts() {
    const [cols, cons] = await Promise.all([
      fetchJSON<Collection[]>(`${data.apiBase}/collections`),
      fetchJSON<Concept[]>(`${data.apiBase}/concepts`),
    ]);
    setCollections(Array.isArray(cols) ? cols : []);
    setConcepts(Array.isArray(cons) ? cons : []);
  }

  async function loadFacts(conceptId: string) {
    const list = await fetchJSON<Fact[]>(
      `${data.apiBase}/facts?concept_id=${conceptId}`
    );
    setFacts(Array.isArray(list) ? list : []);
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

  return (
    <main className="p-4 space-y-8">
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Finder</h1>
          <p className="text-sm text-slate-600">
            Build a Collection → Concept → Fact chain for review.
          </p>
        </div>
        <Link to="/garden" data-testid="nav-garden" className="underline">
          Go to Garden
        </Link>
      </section>

      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <section className="grid gap-6 md:grid-cols-3">
        <form
          onSubmit={handleCreateCollection}
          className="rounded border p-4 space-y-3"
        >
          <h2 className="font-semibold">New Collection</h2>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              data-testid="collection-name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="border p-2 rounded"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Parent (optional)
            <select
              data-testid="collection-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="border p-2 rounded"
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
            className="border rounded px-3 py-2"
          >
            Create Collection
          </button>
        </form>

        <form onSubmit={handleCreateConcept} className="rounded border p-4 space-y-3">
          <h2 className="font-semibold">New Concept</h2>
          <label className="flex flex-col gap-1 text-sm">
            Collection
            <select
              data-testid="concept-collection"
              value={conceptCollection}
              onChange={(e) => setConceptCollection(e.target.value)}
              className="border p-2 rounded"
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
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              data-testid="concept-name"
              value={conceptName}
              onChange={(e) => setConceptName(e.target.value)}
              className="border p-2 rounded"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Kind
            <input
              data-testid="concept-kind"
              value={conceptKind}
              onChange={(e) => setConceptKind(e.target.value)}
              className="border p-2 rounded"
              required
            />
          </label>
          <button
            data-testid="submit-concept"
            type="submit"
            className="border rounded px-3 py-2"
          >
            Create Concept
          </button>
        </form>

        <form onSubmit={handleCreateFact} className="rounded border p-4 space-y-3">
          <h2 className="font-semibold">New Fact</h2>
          <label className="flex flex-col gap-1 text-sm">
            Concept
            <select
              data-testid="fact-concept"
              value={factConcept}
              onChange={(e) => setFactConcept(e.target.value)}
              className="border p-2 rounded"
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
          <label className="flex flex-col gap-1 text-sm">
            Key
            <input
              data-testid="fact-key"
              value={factKey}
              onChange={(e) => setFactKey(e.target.value)}
              className="border p-2 rounded"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Value
            <input
              data-testid="fact-value"
              value={factValue}
              onChange={(e) => setFactValue(e.target.value)}
              className="border p-2 rounded"
              required
            />
          </label>
          <button data-testid="submit-fact" type="submit" className="border rounded px-3 py-2">
            Create Fact
          </button>
        </form>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded border p-4 space-y-2">
          <h3 className="font-semibold">Collections</h3>
          <ul className="space-y-1">
            {collections.map((c) => (
              <li
                key={c.id}
                data-testid={`collection-item-${c.id}`}
                className="border rounded p-2"
              >
                {c.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded border p-4 space-y-2">
          <h3 className="font-semibold">Concepts</h3>
          <ul className="space-y-1">
            {concepts.map((c) => (
              <li
                key={c.id}
                data-testid={`concept-item-${c.id}`}
                className="border rounded p-2"
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-slate-600">{c.kind}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded border p-4 space-y-2">
          <h3 className="font-semibold">Facts (selected concept)</h3>
          {selectedConcept ? (
            <ul className="space-y-1">
              {facts.map((f) => (
                <li
                  key={f.id}
                  data-testid={`fact-item-${f.id}`}
                  className="border rounded p-2"
                >
                  <div className="font-medium">{f.key}</div>
                  <div className="text-sm text-slate-600">{f.value}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">Select a concept to load facts.</p>
          )}
        </div>
      </section>
    </main>
  );
}
