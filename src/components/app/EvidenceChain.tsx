import { useState } from "react";
import { ChevronDown, MessageSquarePlus, SquareCheckBig, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Result, ShipElement } from "@/lib/api";
import { findingTitle } from "@/lib/presentation";
import { ConfidenceTag, StatusBadge } from "./Status";

export function EvidenceChain({ result: r, element, onClose, onReviewed, onNote }: {
  result: Result; element?: ShipElement | undefined; onClose: () => void; onReviewed: () => void; onNote: (n: string) => void;
}) {
  const [auditOpen, setAuditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  return <div className="flex h-full flex-col bg-card">
    <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
      <div><StatusBadge status={r.status} /><h2 className="mt-2 text-xl font-medium">{findingTitle(r)}</h2><p className="mt-1 text-xs text-muted-foreground">{element?.name} · <span className="font-mono">{r.element_id}</span></p></div>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close evidence"><X className="h-4 w-4" /></Button>
    </div>
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <ol className="space-y-4">
        <li><h3 className="mb-2 text-sm font-medium">1. What the rule says</h3><blockquote className="border-l-2 border-primary pl-4 text-sm leading-relaxed">“{r.clause_text}”</blockquote><p className="mt-2 text-xs text-muted-foreground">{r.clause_ref}</p></li>
        <li className="border-t pt-4"><h3 className="mb-2 text-sm font-medium">2. How we checked it</h3><code className="block break-words bg-muted px-4 py-2 font-mono text-xs">{r.condition} {r.unit}</code></li>
        <li className="border-t pt-4"><h3 className="mb-2 text-sm font-medium">3. What we measured</h3>
          {!r.evidence.length && <p className="text-sm text-unknown">No measurement found. Provide {r.check_name.toLowerCase()} for {r.element_id}.</p>}
          <div className="space-y-4">{r.evidence.map((e, i) => <div key={i} className="border-l-2 border-border pl-4"><div className="flex items-center justify-between gap-4"><span className="font-mono text-xl tnum">{e.value ?? "—"} {e.unit}</span><ConfidenceTag c={e.confidence} /></div><p className="mt-2 text-xs">“{e.quote}”</p><p className="mt-2 break-words font-mono text-xs text-muted-foreground">{e.source_file}{e.page ? ` · page ${e.page}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{e.method} · {e.section}</p></div>)}</div>
          {r.confidence === "low" && <p className="mt-2 text-xs text-muted-foreground">Low confidence: please verify the measurement.</p>}
          {r.evidence.length > 1 && <p className="mt-2 text-xs text-muted-foreground">Conflicting sources: confirm which measurement is current.</p>}
        </li>
        <li className="border-t pt-4"><h3 className="mb-2 text-sm font-medium">4. Result and why</h3><p className="text-sm leading-relaxed">{r.reason}</p></li>
        <li className="border-t pt-4"><h3 className="mb-2 text-sm font-medium">5. What to do</h3><p className="text-sm leading-relaxed">{r.recommendation}</p>{!!r.notes?.length && <ul className="mt-2 space-y-2">{r.notes.map((n, i) => <li key={i} className="border-l-2 border-primary pl-4 text-xs">{n}</li>)}</ul>}</li>
      </ol>
      <details className="mt-4 border-t pt-4" open={auditOpen} onToggle={(e) => setAuditOpen(e.currentTarget.open)}><summary className="cursor-pointer text-xs text-muted-foreground">Audit trail · {r.audit.length} events</summary><ul className="mt-2 space-y-2">{r.audit.map((a, i) => <li key={i} className="text-xs"><span className="font-mono text-muted-foreground">{new Date(a.at).toISOString().slice(0, 19).replace("T", " ")} · {a.actor}</span><p>{a.event}</p></li>)}</ul></details>
    </div>
    {noteOpen && <div className="space-y-2 border-t p-4"><Textarea aria-label="Review note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add your engineering note" rows={2} autoFocus /><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>Cancel</Button><Button size="sm" variant="outline" disabled={!note.trim()} onClick={() => { onNote(note.trim()); setNote(""); setNoteOpen(false); }}>Save note</Button></div></div>}
    <div className="flex flex-wrap gap-2 border-t p-4"><Button size="sm" variant="outline" disabled={r.reviewed} onClick={onReviewed}><SquareCheckBig className="h-4 w-4" />{r.reviewed ? "Reviewed" : "Mark as reviewed"}</Button><Button size="sm" variant="ghost" onClick={() => setNoteOpen(true)}><MessageSquarePlus className="h-4 w-4" />Add note</Button></div>
  </div>;
}
