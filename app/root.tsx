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

import type { Route } from "./+types/root";
import "./app.css";

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
        <meta name="theme-color" content="#020617" />
        <Meta />
        <Links />
      </head>
      <body className="bg-slate-950 text-slate-100">
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const location = useLocation();
  const items = [
    { href: "/", label: "Library", icon: "📚" },
    { href: "/garden", label: "Garden", icon: "🪴" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900/90 backdrop-blur px-4 py-2">
      <div className="mx-auto flex max-w-4xl items-center justify-between text-sm font-medium">
        {items.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition ${
                active ? "bg-emerald-500/15 text-emerald-300" : "text-slate-300 hover:text-white"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
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
