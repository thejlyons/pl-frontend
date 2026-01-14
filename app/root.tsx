import { type ReactNode, useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Link,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import { Library, Sprout, Settings } from "lucide-react";

import type { Route } from "./+types/root";
import "./app.css";
import { ProfileProvider, useProfiles } from "./lib/profiles";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "manifest", href: "/manifest.json" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#080e1c" />
        <Meta />
        <Links />
      </head>
      <body className="bg-[var(--color-glass-bg)] text-slate-100">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed", err);
      });
    }
  }, []);

  return (
    <ProfileProvider>
      <div className="min-h-screen bg-[var(--color-glass-bg)] text-slate-100">
        <TopBar />
        <div className="pb-28">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </ProfileProvider>
  );
}

function TopBar() {
  const { profiles, currentProfileId, setCurrentProfileId, createProfile } = useProfiles();

  async function handleCreate() {
    const name = window.prompt("Profile name?");
    if (!name) return;
    try {
      await createProfile(name);
    } catch (err) {
      console.error(err);
      window.alert("Could not create profile");
    }
  }

  return (
    <div className="sticky top-0 z-40 px-4 pt-3 pb-3">
      <div className="glass-navbar mx-auto max-w-5xl rounded-3xl px-5 py-3.5 shadow-lg">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile</span>
            <select
              data-testid="profile-select"
              value={currentProfileId ?? ""}
              onChange={(e) => setCurrentProfileId(e.target.value)}
              className="glass-input rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-slate-100 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              disabled={!profiles.length}
            >
              {profiles.length === 0 ? <option value="">No profiles</option> : null}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="profile-new"
              onClick={handleCreate}
              className="glass-button-primary rounded-2xl px-3 py-2 text-sm font-semibold text-slate-900 hover:shadow-xl"
            >
              New
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="pill bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">Library</span>
            <a href="/settings" className="text-emerald-300 hover:text-emerald-200 transition-colors">
              Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  const location = useLocation();
  const items = [
    { href: "/", label: "Library", icon: Library },
    { href: "/garden", label: "Garden", icon: Sprout },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-3">
      <div className="glass-navbar mx-auto max-w-4xl rounded-3xl px-2 py-2 shadow-lg">
        <div className="flex items-center justify-between text-sm font-medium">
          {items.map((item) => {
            const active = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl px-4 py-2.5 transition-all duration-200 ${
                  active 
                    ? "bg-emerald-400/20 text-emerald-300 shadow-lg shadow-emerald-500/10" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
