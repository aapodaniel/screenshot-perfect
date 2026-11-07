import { useState } from "react";
import { MessageSquarePlus, SquareCheckBig, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Result, ShipElement } from "@/lib/api";
import { findingTitle } from "@/lib/presentation";

export function EvidenceChain({ result: r, element, onClose, onReviewed, onNote }: {
  result: Result; element?: ShipElement | undefined; onClose: () => void; onReviewed: () => void; onNote: (n: string) => void;
}) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  return <div className="flex h-full min-h-0 flex-col bg-card">
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><h2 className="text-base font-medium">{findingTitle(r)}</h2><p className="mt-1 text-xl leading-7">{r.reason}</p></div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose} aria-label="Close evidence" title="Close evidence"><X className="h-4 w-4" /></Button>
      </div>
      <div className="evidence-sections mt-4">
        <section><h3 className="mb-1 text-sm font-medium">Rule says</h3><blockquote className={quoteOpen ? "text-xs leading-5" : "line-clamp-3 text-xs leading-5"}>“{r.clause_text}”</blockquote><Button size="sm" variant="link" className="h-5 p-0 text-xs font-normal" onClick={() => setQuoteOpen((v) => !v)}>{quoteOpen ? "Show less" : "Show more"}</Button><p className="mt-1 text-xs text-muted-foreground">{r.clause_ref}</p></section>
        <section><h3 className="mb-1 text-sm font-medium">Check</h3><code className="break-words font-mono text-xs leading-5">{r.condition} {r.unit}</code><p className="mt-2 text-xs text-muted-foreground"><span className="font-mono">{r.element_id}</span> · {element?.name}</p></section>
        <section><h3 className="mb-1 text-sm font-medium">Measured</h3>{!r.evidence.length && <p className="text-xs leading-5">No measurement found. Provide {r.check_name.toLowerCase()}.</p>}{r.evidence.map((e, i) => <div key={i} className="mb-2 text-xs leading-5"><p><span className="font-mono">{e.value ?? "—"} {e.unit}</span> · {e.method === "Vector measurement" ? "vector" : e.method} · {e.confidence}</p><p className="break-words text-muted-foreground">{e.source_file}{e.page ? <> · p.<span className="font-mono">{e.page}</span></> : ""}</p><details><summary className="cursor-pointer text-muted-foreground">Source evidence</summary><p>“{e.quote}”</p><p>{e.section}</p></details></div>)}{r.confidence === "low" && <p className="text-xs text-muted-foreground">Low confidence: verify the measurement.</p>}{r.evidence.length > 1 && <p className="text-xs text-muted-foreground">Conflicting sources: confirm the current measurement.</p>}</section>
        <section><h3 className="mb-1 text-sm font-medium">Fix</h3><p className="text-xs leading-5">{r.recommendation}</p>{!!r.notes?.length && <ul className="mt-2 space-y-1">{r.notes.map((n, i) => <li key={i} className="border-l-2 border-primary pl-2 text-xs">{n}</li>)}</ul>}</section>
      </div>
      <details className="mt-3 border-t pt-2"><summary className="cursor-pointer text-xs text-muted-foreground">Audit trail · {r.audit.length} events</summary><ul className="mt-2 space-y-2">{r.audit.map((a, i) => <li key={i} className="text-xs"><span className="font-mono text-muted-foreground">{new Date(a.at).toISOString().slice(0, 19).replace("T", " ")}</span> · {a.actor}<p>{a.event}</p></li>)}</ul></details>
      {noteOpen && <div className="mt-3 space-y-2 border-t pt-3"><Textarea aria-label="Review note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add your engineering note" rows={2} autoFocus /><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>Cancel</Button><Button size="sm" variant="outline" disabled={!note.trim()} onClick={() => { onNote(note.trim()); setNote(""); setNoteOpen(false); }}>Save note</Button></div></div>}
    </div>
    <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-2"><Button size="sm" className="h-7 text-xs" variant="outline" disabled={r.reviewed} onClick={onReviewed}><SquareCheckBig className="h-3.5 w-3.5" />{r.reviewed ? "Reviewed" : "Mark reviewed"}</Button><Button size="sm" className="h-7 text-xs" variant="ghost" onClick={() => setNoteOpen(true)}><MessageSquarePlus className="h-3.5 w-3.5" />Add note</Button></div>
  </div>;
}
