import type { Result, ShipElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfidenceTag, ReviewBadge, StatusBadge } from "./Status";

export function ResultsTable({ results, elements, selectedId, onSelect }: {
  results: Result[]; elements: ShipElement[]; selectedId: string | null; onSelect: (r: Result) => void;
}) {
  const el = (id: string) => elements.find((e) => e.id === id);
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Check</th>
            <th className="px-3 py-2 font-medium">Element</th><th className="px-3 py-2 font-medium">Rule clause</th>
            <th className="px-3 py-2 text-right font-medium">Measured</th><th className="px-3 py-2 text-right font-medium">Required</th>
            <th className="px-3 py-2 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const e = el(r.element_id);
            return (
              <tr key={r.id} onClick={() => onSelect(r)}
                className={cn("cursor-pointer border-t align-top hover:bg-muted/50", selectedId === r.id && "bg-accent hover:bg-accent")}>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-1"><StatusBadge status={r.status} />{r.needs_review && <ReviewBadge />}</div>
                </td>
                <td className="px-3 py-2 font-medium">{r.check_name}<div className="text-xs font-normal text-muted-foreground">{r.rule_set}</div></td>
                <td className="px-3 py-2"><div className="whitespace-nowrap font-mono text-xs">{r.element_id}</div><div className="text-xs text-muted-foreground">{e?.space} · {e?.deck}</div></td>
                <td className="px-3 py-2 text-xs">{r.clause_ref}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-xs tnum">{r.measured === null ? <span className="text-unknown">—</span> : `${r.measured} ${r.unit}`}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-xs tnum">{r.required} {r.unit}</td>
                <td className="px-3 py-2"><ConfidenceTag c={r.confidence} /></td>
              </tr>
            );
          })}
          {!results.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">No checks match these filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
