import type { ReactNode } from "react";
import { Link } from "react-router";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="pill bg-emerald-500/10 text-emerald-300">Perennial</p>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
          {subtitle ? <p className="text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass-card ${className}`}>{children}</div>;
}

export function OutlineButton({
  to,
  children,
  "data-testid": dataTestId,
}: {
  to: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <Link
      to={to}
      data-testid={dataTestId}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500 hover:text-white"
    >
      {children}
    </Link>
  );
}
