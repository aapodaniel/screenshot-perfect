import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Answer, Question, ShipElement } from "@/lib/types";

export function QuestionList({ questions, elements, onRecheck, busy }: {
  questions: Question[]; elements: ShipElement[]; onRecheck: (a: Answer[]) => void; busy: boolean;
}) {
  const [vals, setVals] = useState<Record<string, string>>({});
  if (!questions.length)
    return <div className="rounded-md border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No missing information — every check could be decided from the documents.</div>;
  const sorted = [...questions].sort((a, b) => b.resolves_count - a.resolves_count);
  return (
    <ol className="space-y-3">
      {sorted.map((q, i) => {
        const answers: Answer[] = q.element_ids
          .map((id) => ({ attr: q.attr, element_id: id, value: parseFloat(vals[`${q.attr}:${id}`] ?? "") }))
          .filter((a) => Number.isFinite(a.value));
        return (
          <li key={q.attr} className="rounded-md border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-unknown-soft font-mono text-xs font-semibold text-unknown">{i + 1}</span>
                <div>
                  <div className="font-medium">{q.label} <code className="ml-1 font-mono text-xs text-muted-foreground">{q.attr}</code></div>
                  <div className="text-xs text-muted-foreground">Resolves <b className="font-mono text-foreground">{q.resolves_count}</b> check{q.resolves_count > 1 ? "s" : ""} · Ask: {q.owner}</div>
                </div>
              </div>
              <Button size="sm" disabled={!answers.length || busy} onClick={() => onRecheck(answers)}>
                <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Re-check{answers.length ? ` (${answers.length})` : ""}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 pl-9">
              {q.element_ids.map((id) => {
                const el = elements.find((e) => e.id === id);
                return (
                  <label key={id} className="flex items-center gap-2 rounded border bg-background px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs" title={el?.name}>{id}</span>
                    <Input type="number" inputMode="decimal" className="h-7 w-20 text-right font-mono text-xs" placeholder="—"
                      value={vals[`${q.attr}:${id}`] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [`${q.attr}:${id}`]: e.target.value }))} aria-label={`${q.label} for ${id}`} />
                    <span className="w-6 text-xs text-muted-foreground">{q.unit}</span>
                  </label>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
