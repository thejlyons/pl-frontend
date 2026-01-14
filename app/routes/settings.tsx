import { type FormEvent, useEffect, useMemo, useState } from "react";

import { useProfiles } from "../lib/profiles";
import { Card, PageHeader } from "../lib/ui";

export default function Settings() {
  const [installPrompted, setInstallPrompted] = useState(false);
  const { currentProfile, updateProfileSRS } = useProfiles();

  const baseInterval = currentProfile?.srs_config.base_interval_days ?? 1;
  const [baseEase, setBaseEase] = useState(currentProfile?.srs_config.ease_multiplier ?? 2.5);
  const [intervalMod, setIntervalMod] = useState(
    currentProfile?.srs_config.interval_modifier ?? 1,
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstallPrompted(true);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);

  useEffect(() => {
    if (!currentProfile) return;
    setBaseEase(currentProfile.srs_config.ease_multiplier ?? 2.5);
    setIntervalMod(currentProfile.srs_config.interval_modifier ?? 1);
  }, [currentProfile?.id]);

  const simulatedPath = useMemo(() => {
    const steps = simulatePath(baseInterval, baseEase, intervalMod);
    return steps.map((d) => `${d}d`).join(" -> ");
  }, [baseInterval, baseEase, intervalMod]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!currentProfile) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateProfileSRS(currentProfile.id, {
        base_interval_days: baseInterval,
        ease_multiplier: Number(baseEase) || 0,
        interval_modifier: Number(intervalMod) || 0,
      });
      setSaveMsg("Saved");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unable to save settings";
      setSaveMsg(detail);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 detached-content text-slate-100">
      <PageHeader
        title="Settings"
        subtitle="PWA install readiness and theme preferences."
      />

      <Card className="space-y-4 p-6">
        <div className="space-y-1">
          <p className="pill bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 inline-block">PWA</p>
          <h2 className="text-xl font-semibold text-white">Install Perennial</h2>
          <p className="text-sm text-slate-400">
            Add Perennial to your home screen for a fullscreen, offline-friendly experience.
          </p>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>We ship a manifest with dark theme colors and install icons.</li>
          <li>A lightweight service worker precaches the shell for faster reloads.</li>
          <li>{installPrompted ? "Your browser is ready to prompt for install." : "Visit on mobile to trigger the install banner."}</li>
        </ul>
      </Card>

      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <p className="pill bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 inline-block">Scheduling</p>
          <h2 className="text-xl font-semibold text-white">Tuning Dashboard</h2>
          <p className="text-sm text-slate-400">
            Adjust how fast cards advance. Higher ease or speed means longer jumps between reviews.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>Base Ease</span>
                <span className="text-slate-300">{baseEase.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={1.3}
                max={4.0}
                step={0.05}
                value={baseEase}
                onChange={(e) => setBaseEase(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-slate-400">
                Higher ease makes cards leap further when you answer correctly.
              </p>
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>Interval Modifier</span>
                <span className="text-slate-300">{intervalMod.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={intervalMod}
                onChange={(e) => setIntervalMod(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-slate-400">Speed up or slow down the entire curve.</p>
            </label>
          </div>

          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/40 backdrop-blur-xl p-4 text-sm text-emerald-100 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Simulation</p>
            <p className="font-semibold text-white">Path: {simulatedPath}</p>
            <p className="text-slate-400">Sequence: Good → Easy → Good → Easy (days between reviews)</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || !currentProfile}
              className="glass-button-primary rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-900 hover:shadow-xl transition-all duration-200 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save tuning"}
            </button>
            {saveMsg ? <span className="text-xs text-slate-300">{saveMsg}</span> : null}
          </div>
        </form>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-xl font-semibold text-white">Theme</h2>
        <p className="text-sm text-slate-400">
          Perennial uses an iOS 26-inspired liquid glass design for an elegant, immersive experience.
        </p>
        <p className="text-sm text-slate-300">
          Background: Deep space gradient · Accent: Emerald glass effects · Detached components with enhanced blur.
        </p>
      </Card>
    </main>
  );
}

type Rating = "again" | "hard" | "good" | "easy";

function simulateStep(interval: number, ease: number, rating: Rating, baseInterval: number, intervalMod: number) {
  const safeInterval = Math.max(interval, baseInterval, 0);
  const safeEase = ease || 2.5;
  switch (rating) {
    case "again":
      return { interval: 0, ease: Math.max(1.3, safeEase - 0.2) };
    case "hard":
      return { interval: Math.ceil(safeInterval * 1.2 * intervalMod), ease: Math.max(1.3, safeEase - 0.15) };
    case "good":
      return { interval: Math.ceil(safeInterval * safeEase * intervalMod), ease: safeEase };
    case "easy":
      return { interval: Math.ceil(safeInterval * safeEase * 1.3 * intervalMod), ease: Math.max(1.3, safeEase + 0.15) };
  }
}

function simulatePath(baseInterval: number, ease: number, intervalMod: number) {
  const seq: Rating[] = ["good", "easy", "good", "easy"];
  let currentInterval = Math.max(1, Math.round(baseInterval));
  let currentEase = ease || 2.5;
  const path: number[] = [];

  for (const rating of seq) {
    const next = simulateStep(currentInterval, currentEase, rating, Math.max(1, baseInterval), intervalMod || 1);
    currentInterval = next.interval;
    currentEase = next.ease;
    path.push(Math.max(0, currentInterval));
  }

  return path.length ? [Math.max(1, Math.round(baseInterval)), ...path] : [Math.max(1, Math.round(baseInterval))];
}
