import { useEffect, useState } from "react";

import { Card, PageHeader } from "../lib/ui";

export default function Settings() {
  const [installPrompted, setInstallPrompted] = useState(false);

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstallPrompted(true);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 pb-12 pt-6 text-slate-100">
      <PageHeader
        title="Settings"
        subtitle="PWA install readiness and theme preferences."
      />

      <Card className="space-y-4 p-6">
        <div className="space-y-1">
          <p className="pill bg-emerald-500/15 text-emerald-300">PWA</p>
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

      <Card className="space-y-3 p-6">
        <h2 className="text-xl font-semibold text-white">Theme</h2>
        <p className="text-sm text-slate-400">
          Perennial runs in dark mode only to keep focus on the garden.
        </p>
        <p className="text-sm text-slate-300">
          Background: #020617 · Accent: Emerald 400.
        </p>
      </Card>
    </main>
  );
}
