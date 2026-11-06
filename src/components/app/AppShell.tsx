import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, ClipboardCheck, PanelLeftClose, PanelLeftOpen, Settings2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Inspections", icon: ClipboardCheck, match: (p: string) => p === "/" || p.startsWith("/inspections") },
  { to: "/rules", label: "Rule library", icon: BookOpenCheck, match: (p: string) => p.startsWith("/rules") },
  { to: "/settings", label: "Settings", icon: Settings2, match: (p: string) => p.startsWith("/settings") },
] as const;

function ApiStatus() {
  const s = useSettings();
  const { data } = useQuery({ queryKey: ["health", s.demo, s.apiUrl], queryFn: api.health, refetchInterval: 15000 });
  const live = !s.demo && data?.ok;
  const label = s.demo ? "Demo data" : !data ? "Checking…" : data.ok ? `Connected to ${s.apiUrl}` : `Unreachable — demo data`;
  return (
    <Link to="/settings" className="flex items-center gap-2 rounded border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
      <span className={cn("h-2 w-2 rounded-full", live ? "bg-pass" : !s.demo && data && !data.ok ? "bg-unknown" : "bg-muted-foreground/50")} aria-hidden />
      <span className="font-mono">{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useSettings();
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn("no-print sticky top-0 flex h-screen shrink-0 flex-col border-r bg-sidebar transition-[width]", collapsed ? "w-14" : "w-56")}>
        <div className="flex h-12 items-center gap-2 border-b px-3">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary font-mono text-xs font-bold text-primary-foreground">P</div>
          {!collapsed && <span className="text-sm font-semibold tracking-tight">ProvenAI</span>}
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((n) => {
            const active = n.match(path);
            return (
              <Link key={n.to} to={n.to} title={n.label}
                className={cn("flex items-center gap-2.5 rounded px-2.5 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent",
                  active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground")}>
                <n.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {!collapsed && n.label}
              </Link>
            );
          })}
        </nav>
        {!collapsed && (
          <p className="border-t p-3 text-[11px] leading-snug text-muted-foreground">
            AI extracts evidence only. Deterministic code decides PASS / FAIL. Missing evidence ⇒ UNKNOWN.
          </p>
        )}
        <button onClick={() => setCollapsed((c) => !c)} className="flex h-10 items-center justify-center border-t text-muted-foreground hover:bg-sidebar-accent" aria-label="Toggle sidebar">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-12 items-center justify-between border-b bg-background/95 px-5 backdrop-blur">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold">RV60 Research Vessel</span>
            <span className="font-mono text-xs text-muted-foreground">Hull 1147</span>
          </div>
          <ApiStatus />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="no-print flex items-center gap-2">{actions}</div>}
    </div>
  );
}
