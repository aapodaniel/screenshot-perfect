import { Check, CircleHelp, X } from "lucide-react";
import type { Result } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function StatCards({ results, source, updated = 0, activeStatus, onStatus }: { results: Result[]; source?: string; updated?: number; activeStatus?: string; onStatus?: (status: string) => void }) {
  const total = results.length, unknown = results.filter((r) => r.status === "UNKNOWN").length;
  const coverage = total ? Math.round((total - unknown) / total * 100) : 0;
  const chips = [{ status: "FAIL", label: "Violations", icon: X, color: "text-fail" }, { status: "UNKNOWN", label: "Cannot check", icon: CircleHelp, color: "text-unknown" }, { status: "PASS", label: "OK", icon: Check, color: "text-pass" }];
  return <section key={updated} aria-label="Inspection verdict" aria-live="polite" className={cn("flex flex-wrap items-center gap-2", updated > 0 && "verdict-updated")}>
    {chips.map((c) => <Button key={c.status} variant="outline" size="sm" aria-pressed={activeStatus === c.status} onClick={() => onStatus?.(c.status)} className={cn("h-8 gap-2 font-normal", activeStatus === c.status && "border-primary bg-accent")}><c.icon className={cn("h-4 w-4", c.color)} /><span className="font-mono">{results.filter((r) => r.status === c.status).length}</span>{c.label}</Button>)}
    <TooltipProvider><Tooltip><TooltipTrigger asChild><span tabIndex={0} className="ml-2 cursor-help text-xs text-muted-foreground"><span className="font-mono">{coverage}%</span> decided</span></TooltipTrigger><TooltipContent className="max-w-sm">Checked {total} rules from {[...new Set(results.map((r) => r.rule_set.split(" – ")[0]))].join(", ")} against {source ?? "the design documents"}. {unknown} checks need more evidence.</TooltipContent></Tooltip></TooltipProvider>
  </section>;
}
