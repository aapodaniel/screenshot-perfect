import { useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Result, ShipElement } from "@/lib/api";
import { findingNumber, findingTitle, revisionChange } from "@/lib/presentation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./Status";

export function ResultsTable({ results, elements, selectedId, onSelect, previous, showChanges }: {
  results: Result[]; elements: ShipElement[]; selectedId: string | null; onSelect: (r: Result) => void;
  previous?: Result[] | undefined; showChanges?: boolean;
}) {
  const [passedOpen, setPassedOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const groups = ["FAIL", "UNKNOWN", "PASS"] as const;
  const visible = results.filter((r) => r.status !== "PASS" || passedOpen);
  return <div ref={list} aria-label="Findings" className="divide-y border-y bg-card" onKeyDown={(e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button[data-finding]") ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = Math.max(0, Math.min(buttons.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    e.preventDefault(); buttons[next]?.focus();
  }}>
    {groups.map((status) => {
      const rows = results.filter((r) => r.status === status);
      if (!rows.length) return null;
      return <section key={status}>
        {status === "PASS" ? <Button variant="ghost" className="h-12 w-full justify-start rounded-none px-4 text-xs text-pass" onClick={() => setPassedOpen((v) => !v)}>{passedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{rows.length} passed — {passedOpen ? "hide" : "show"}</Button> : <h3 className="px-4 py-4 text-sm font-medium">{rows.length} {status === "FAIL" ? "rule violations" : "items we cannot check"}</h3>}
        {(status !== "PASS" || passedOpen) && rows.map((r) => {
          const element = elements.find((el) => el.id === r.element_id);
          const index = results.indexOf(r) + 1;
          return <Button key={r.id} data-finding={r.id} aria-pressed={selectedId === r.id} variant="ghost" onClick={() => onSelect(r)} className={cn("finding-row h-auto min-h-12 w-full items-start justify-start gap-4 whitespace-normal rounded-none border-t px-4 py-4 text-left font-normal", selectedId === r.id && "bg-accent hover:bg-accent border-l-4 border-l-primary")}>
            <span className="mt-1 font-mono text-xs text-muted-foreground">{index.toString().padStart(2, "0")}</span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><StatusBadge status={r.status} />{showChanges && previous && <span className={cn("text-xs", revisionChange(r, previous) === "New" ? "text-fail" : revisionChange(r, previous) === "Fixed" ? "text-pass" : "text-muted-foreground")}>{revisionChange(r, previous)}</span>}</span>
              <span className="mt-2 block text-sm font-medium">{findingTitle(r)}</span>
              <span className="mt-1 block font-mono text-xs">{r.element_id} · {element?.space ? `Cabin ${element.space}` : element?.name}</span>
              <span className={cn("mt-2 block text-xs", r.status === "FAIL" ? "text-fail" : "text-muted-foreground")}>{findingNumber(r)}</span>
              <span className="mt-2 block text-xs text-muted-foreground">{r.clause_ref}</span>
            </span><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>;
        })}
      </section>;
    })}
    {!visible.length && !results.length && <p className="px-4 py-8 text-sm text-muted-foreground">No checks match. Clear the filters to see all findings.</p>}
  </div>;
}
