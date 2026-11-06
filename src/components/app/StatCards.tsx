import { CheckCircle2, CircleHelp, Eye, ListChecks, XCircle } from "lucide-react";
import type { Result } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatCards({ results }: { results: Result[] }) {
  const n = (s: string) => results.filter((r) => r.status === s).length;
  const total = results.length, decided = total - n("UNKNOWN");
  const cov = total ? Math.round((decided / total) * 100) : 0;
  const cards = [
    { label: "Total checks", v: total, icon: ListChecks, cls: "text-foreground" },
    { label: "PASS", v: n("PASS"), icon: CheckCircle2, cls: "text-pass" },
    { label: "FAIL", v: n("FAIL"), icon: XCircle, cls: "text-fail" },
    { label: "UNKNOWN", v: n("UNKNOWN"), icon: CircleHelp, cls: "text-unknown" },
    { label: "Needs review", v: results.filter((r) => r.needs_review).length, icon: Eye, cls: "text-review" },
  ];
  return (
    <div className="grid grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border bg-card px-4 py-3">
          <div className={cn("flex items-center gap-1.5 text-xs font-medium", c.cls)}>
            <c.icon className="h-3.5 w-3.5" aria-hidden />{c.label}
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold tnum">{c.v}</div>
        </div>
      ))}
      <div className="rounded-md border bg-card px-4 py-3">
        <div className="text-xs font-medium text-muted-foreground">Coverage</div>
        <div className="mt-1 font-mono text-2xl font-semibold tnum">{cov}%</div>
        <div className="mt-1.5 h-1 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${cov}%` }} /></div>
        <div className="mt-1 text-[11px] text-muted-foreground">{decided} of {total} checks could be decided</div>
      </div>
    </div>
  );
}
