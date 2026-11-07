import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import type { Result } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatCards({ results, source, updated = 0 }: { results: Result[]; source?: string; updated?: number }) {
  const n = (s: string) => results.filter((r) => r.status === s).length;
  const total = results.length, decided = total - n("UNKNOWN");
  const cov = total ? Math.round((decided / total) * 100) : 0;
  const cards = [
    { label: "rule violations", v: n("FAIL"), icon: XCircle, cls: "text-fail" },
    { label: "items could not be checked", v: n("UNKNOWN"), icon: CircleHelp, cls: "text-unknown" },
    { label: "OK", v: n("PASS"), icon: CheckCircle2, cls: "text-pass" },
  ];
  return (
    <section key={updated} aria-label="Inspection verdict" aria-live="polite" className={cn("border-y bg-card px-6 py-6", updated > 0 && "verdict-updated")}>
      <h2 className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[28px] font-medium leading-tight">
        {cards.map((c, i) => <span key={c.label} className="inline-flex items-center gap-2">{i > 0 && <span className="mr-2 text-muted-foreground" aria-hidden>·</span>}<c.icon className={cn("h-6 w-6 shrink-0", c.cls)} /><span><span className="font-mono tnum">{c.v}</span> {c.label}</span></span>)}
      </h2>
      <p className="mt-4 text-sm text-muted-foreground">Checked {total} rules from {[...new Set(results.map((r) => r.rule_set.split(" – ")[0]))].join(", ")} against {source ?? "the design documents"}.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4"><progress className="coverage-bar h-1 w-32" max={100} value={cov} aria-label="Decided checks" /><span className="text-xs text-muted-foreground"><span className="font-mono tnum">{cov}%</span> of checks could be decided</span>{updated > 0 && <span className="text-xs font-medium text-primary">Updated with your measurement</span>}</div>
    </section>
  );
}
