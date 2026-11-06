import { useState, type ReactNode } from "react";
import { BookText, ChevronDown, Copy, FileSearch, Gavel, History, MessageSquarePlus, SquareCheckBig, Wrench, X, Cpu } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Result, ShipElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfidenceTag, ReviewBadge, StatusBadge } from "./Status";

function Step({ icon: Icon, title, children, last, tone }: { icon: typeof BookText; title: string; children: ReactNode; last?: boolean; tone?: string }) {
  return (
    <li className="relative flex gap-3 pb-5">
      {!last && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden />}
      <span className={cn("z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-card", tone)}><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
        {children}
      </div>
    </li>
  );
}

export function EvidenceChain({ result: r, element, onClose, onReviewed, onNote }: {
  result: Result; element?: ShipElement; onClose: () => void; onReviewed: () => void; onNote: (n: string) => void;
}) {
  const [auditOpen, setAuditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const citation = `${r.clause_ref} — "${r.clause_text}" | ${r.condition} | ${element?.name ?? r.element_id}: ${r.status}. ${r.reason}${r.evidence.map((e) => ` Source: ${e.source_file}${e.page ? ` p.${e.page}` : ""}, ${e.section}.`).join("")}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={r.status} />{r.needs_review && <ReviewBadge />}
            {r.reviewed && <span className="text-[11px] font-medium text-pass">✓ Reviewed</span>}</div>
          <h2 className="mt-1.5 font-semibold leading-tight">{r.check_name}</h2>
          <p className="font-mono text-xs text-muted-foreground">{element?.name} · {r.element_id}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        <ol>
          <Step icon={BookText} title="a · Regulation">
            <div className="text-sm font-medium">{r.rule_set} · {r.clause_ref}</div>
            <blockquote className="mt-1.5 border-l-2 border-primary/50 pl-3 text-sm italic text-muted-foreground">“{r.clause_text}”</blockquote>
          </Step>
          <Step icon={Cpu} title="b · Check logic (deterministic)">
            <code className="block rounded bg-muted px-2.5 py-1.5 font-mono text-sm">{r.condition}</code>
            <div className="mt-1.5 text-xs text-muted-foreground">Inputs needed: {r.required_inputs.map((i) => <code key={i} className="font-mono text-foreground">{i}</code>)}</div>
          </Step>
          <Step icon={FileSearch} title="c · Extracted evidence">
            {!r.evidence.length && (
              <div className="rounded border border-dashed border-unknown/50 bg-unknown-soft px-3 py-2 text-sm text-unknown">
                No evidence for <code className="font-mono">{r.missing.join(", ")}</code> in any source document.
              </div>
            )}
            <div className="space-y-2">
              {r.evidence.map((e, i) => (
                <div key={i} className={cn("rounded border bg-card p-2.5", r.evidence.length > 1 && "border-review/40")}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold tnum">{e.value} {e.unit}</span>
                    <ConfidenceTag c={e.confidence} />
                  </div>
                  <div className="mt-1 rounded bg-muted/60 px-2 py-1 font-mono text-xs">“{e.quote}”</div>
                  <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-muted-foreground">Source</dt><dd className="truncate font-mono" title={e.source_file}>{e.source_file}</dd>
                    <dt className="text-muted-foreground">Location</dt><dd>{e.page ? `p.${e.page} · ` : ""}{e.section}</dd>
                    <dt className="text-muted-foreground">Method</dt><dd>{e.method}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </Step>
          <Step icon={Gavel} title="d · Decision" tone={r.status === "FAIL" ? "text-fail" : r.status === "PASS" ? "text-pass" : "text-unknown"}>
            <div className="flex items-center gap-2"><StatusBadge status={r.status} /></div>
            <p className="mt-1.5 font-mono text-sm">{r.reason}</p>
          </Step>
          <Step icon={Wrench} title={r.status === "UNKNOWN" ? "e · Missing information" : "e · Recommended action"}>
            <p className="text-sm">{r.recommendation}</p>
            {!!r.notes?.length && <ul className="mt-2 space-y-1">{r.notes.map((n, i) => <li key={i} className="rounded bg-muted px-2 py-1 text-xs">📝 {n}</li>)}</ul>}
          </Step>
          <Step icon={History} title="f · Audit trail" last>
            <button className="flex items-center gap-1 text-xs text-primary" onClick={() => setAuditOpen((o) => !o)}>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", auditOpen && "rotate-180")} />
              {auditOpen ? "Hide" : "Show"} {r.audit.length} events
            </button>
            {auditOpen && (
              <ul className="mt-2 space-y-1.5">
                {r.audit.map((a, i) => (
                  <li key={i} className="text-xs">
                    <span className="font-mono text-muted-foreground tnum">{new Date(a.at).toISOString().replace("T", " ").slice(0, 19)}</span>
                    <span className="ml-1.5 text-muted-foreground">[{a.actor}]</span>
                    <div>{a.event}</div>
                  </li>
                ))}
              </ul>
            )}
          </Step>
        </ol>
      </div>
      {noteOpen && (
        <div className="space-y-2 border-t p-3">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Door supplier confirms 850 mm leaf available — revise schedule rev E" rows={2} autoFocus />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!note.trim()} onClick={() => { onNote(note.trim()); setNote(""); setNoteOpen(false); }}>Save note</Button>
          </div>
        </div>
      )}
      <div className="flex gap-2 border-t p-3">
        <Button size="sm" variant={r.reviewed ? "secondary" : "default"} disabled={r.reviewed} onClick={onReviewed}><SquareCheckBig className="h-4 w-4" />{r.reviewed ? "Reviewed" : "Mark as reviewed"}</Button>
        <Button size="sm" variant="outline" onClick={() => setNoteOpen(true)}><MessageSquarePlus className="h-4 w-4" />Add note</Button>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(citation); toast.success("Citation copied"); }}><Copy className="h-4 w-4" />Copy citation</Button>
      </div>
    </div>
  );
}
