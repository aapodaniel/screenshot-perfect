import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrawingViewer } from "./DrawingViewer";
import { EvidenceChain } from "./EvidenceChain";
import { QuestionList } from "./QuestionList";
import { MeasurementsTable } from "./MeasurementsTable";
import { PrintReport } from "./PrintReport";
import { workspaceCommand } from "./AppShell";
import { api, qk, type Inspection, type Result } from "@/lib/api";
import { checkerFix, checkerMeasurement, revisionChange } from "@/lib/presentation";
import { useSettings } from "@/lib/settings";

export function CheckerWorkspace({ id, calibrate = false, initialChecked = false }: { id: string; calibrate?: boolean; initialChecked?: boolean }) {
  const settings = useSettings(), qc = useQueryClient();
  const key = ['inspection', id, ...qk.all()];
  const { data: insp, error } = useQuery({ queryKey: key, queryFn: () => api.inspection(id), refetchInterval: q => q.state.data?.status === 'done' ? false : 1000 });
  const { data: packs } = useQuery({ queryKey: ['ruleSets', ...qk.all()], queryFn: api.ruleSets });
  const { data: previous } = useQuery({ queryKey: ['inspection', insp?.previous_revision?.id, ...qk.all()], queryFn: () => api.inspection(insp?.previous_revision?.id ?? ''), enabled: !!insp?.previous_revision });
  const [checked,setChecked] = useState(initialChecked), [running,setRunning] = useState(false), [limit,setLimit] = useState(0), [runId,setRunId] = useState(0);
  const [selectedId,setSelectedId] = useState<string | null>(null), [panel,setPanel] = useState<'properties' | 'missing' | 'measurements' | null>(null);
  const [show,setShow] = useState('ALL'), [search,setSearch] = useState(''), [changes,setChanges] = useState(false);
  const [cursor,setCursor] = useState<{x:number;y:number} | null>(null), [zoom,setZoom] = useState(100);
  const update = (data: Inspection) => qc.setQueryData(key,data);
  const answers = useMutation({ mutationFn: (a: Parameters<typeof api.submitAnswers>[1]) => api.submitAnswers(id,a), onSuccess: update });
  const review = useMutation({ mutationFn: (rid:string) => api.markReviewed(id,rid), onSuccess: update });
  const note = useMutation({ mutationFn: ({rid,n}:{rid:string;n:string}) => api.addNote(id,rid,n), onSuccess: update });
  const results = useMemo(() => [...(insp?.results ?? [])].sort((a,b) => ({FAIL:0,UNKNOWN:1,PASS:2}[a.status] - {FAIL:0,UNKNOWN:1,PASS:2}[b.status]) || (a.element_id === 'D-01-36-2' ? -1 : b.element_id === 'D-01-36-2' ? 1 : a.element_id.localeCompare(b.element_id))), [insp]);
  const problems = results.filter(r => r.status !== 'PASS');
  const selected = results.find(r => r.id === selectedId) ?? null;
  const run = () => { if (!insp || running || insp.status !== 'done') return; setChecked(true); setRunning(true); setLimit(0); setSelectedId(null); setPanel(null); setRunId(v => v+1); };
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setLimit(n => n+1),300);
    const done = window.setTimeout(() => { setRunning(false); }, Math.max(1,problems.length)*300+100);
    return () => { window.clearInterval(timer); window.clearTimeout(done); };
  }, [running,runId,problems.length]);
  useEffect(() => {
    const listener = (event: Event) => {
      const command = (event as CustomEvent<string>).detail;
      if (command === 'run') run();
      if (command === 'missing' || command === 'measurements') setPanel(command);
      if (command === 'changes') { setChecked(true); setChanges(v => !v); }
      if (command === 'json' && insp) { const blob = new Blob([JSON.stringify(insp,null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`${insp.id}-report.json`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url),1000); }
    };
    window.addEventListener('checker-command',listener); return () => window.removeEventListener('checker-command',listener);
  }, [insp,running]);
  const choose = (r: Result) => { setSelectedId(r.id); setPanel('properties'); };
  const filtered = results.filter(r => (show === 'ALL' || (show === 'REDLINES' ? r.status === 'FAIL' : r.status === 'UNKNOWN')) && [r.element_id,r.check_name,r.clause_ref].join(' ').toLowerCase().includes(search.toLowerCase()));
  const displayed = filtered.filter(r => r.status !== 'PASS');
  const pdf = insp?.files.find(f => f.type === 'application/pdf');
  if (error) return <div className="p-4">Inspection not found.</div>;
  if (!insp) return <div className="p-4 font-mono text-xs">LOADING DRAWING</div>;
  return <>
  <div className="checker-workspace no-print">
    <div className="checker-toolbar">
      <Button onClick={run} disabled={running || insp.status !== 'done'}>{running || insp.status !== 'done' ? 'CHECKING' : 'RUN CHECK'}</Button>
      <Button variant="ghost" asChild><a href="/rules">RULE PACKS: {(packs ?? []).filter(p => insp.rule_set_ids.includes(p.id)).map(p => p.id.startsWith("ada") ? "ADA" : p.id.startsWith("dnv") ? "DNV" : p.authority).join(' · ') || 'LOADING'}</a></Button>
      <label className="toolbar-filter">SHOW: <select aria-label="Show markup" value={show} onChange={e => setShow(e.target.value)}><option>REDLINES</option><option>UNKNOWNS</option><option>ALL</option></select></label>
      <div className="toolbar-zoom"><Button variant="ghost" aria-label="Zoom out" onClick={() => workspaceCommand('zoom-out')}>−</Button><Button variant="ghost" onClick={() => workspaceCommand('fit')} title="Fit drawing">{zoom}%</Button><Button variant="ghost" aria-label="Zoom in" onClick={() => workspaceCommand('zoom-in')}>+</Button></div>
    </div>
    <div className="checker-sheet-area">
      <div className="checker-canvas">
        <DrawingViewer key={runId} compact calibrate={calibrate} elements={insp.elements} results={checked ? results.filter(r => show === 'ALL' || (show === 'REDLINES' ? r.status === 'FAIL' : r.status === 'UNKNOWN')) : []} markerLimit={running ? limit : undefined} selectedElementId={selected?.element_id ?? null} selectedResult={selected} onCursor={setCursor} onZoom={setZoom} onSelectElement={(eid,rid) => { const r = results.find(r => r.id === rid) ?? results.find(r => r.element_id === eid); if (r) choose(r); }} pdfUrl={pdf ? api.fileUrl(insp.id,pdf.id) : null} fileName={pdf?.name}/>
        {panel && <div className="checker-inspector">
          {panel === 'properties' && selected ? <EvidenceChain key={selected.id} result={selected} element={insp.elements.find(e => e.id === selected.element_id)} onClose={() => setPanel(null)} onReviewed={() => review.mutate(selected.id)} onNote={n => note.mutate({rid:selected.id,n})}/> : <section className="properties-panel"><header className="properties-heading"><span>{panel === 'missing' ? 'REQUIRED MEASUREMENTS' : 'MEASURED PROPERTIES'}</span><Button variant="ghost" aria-label="Close properties" onClick={() => setPanel(null)}>×</Button></header><div className="properties-body">{panel === 'missing' ? <QuestionList questions={insp.questions} elements={insp.elements} busy={answers.isPending} onRecheck={a => answers.mutate(a)}/> : <MeasurementsTable elements={insp.elements}/>}</div></section>}
        </div>}
      </div>
      <aside className="checker-notes" aria-label="Checker's notes"><header>CHECKER'S NOTES {checked && <span className="font-mono">{problems.length}</span>}</header>
        {!checked ? <p className="notes-empty">Run the check. Problems get redlined on the drawing.</p> : <>
          <Input aria-label="Search findings" className="notes-search" placeholder="Find ID / check / clause" value={search} onChange={e => setSearch(e.target.value)}/>
          {changes && <div className="notes-ruled-heading">{insp.previous_revision ? `CHANGES SINCE ${insp.previous_revision.label}` : 'NO PREVIOUS REVISION'}</div>}
          <div className="notes-scroll" onKeyDown={e => { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-note]')); const index=buttons.indexOf(document.activeElement as HTMLButtonElement); e.preventDefault(); buttons[Math.max(0,Math.min(buttons.length-1,index+(e.key === 'ArrowDown' ? 1 : -1)))]?.focus(); }}>
          {(['FAIL','UNKNOWN'] as const).map(status => <section key={status}>{displayed.some(r => r.status === status) && <h3 className="notes-ruled-heading">{status === 'FAIL' ? 'NONCONFORMITIES' : 'NOT VERIFIED'}</h3>}{displayed.filter(r => r.status === status).map(r => <Button variant="ghost" className="checker-note" key={r.id} data-note={r.id} aria-pressed={selectedId === r.id} onClick={() => choose(r)}><span className={status === 'FAIL' ? 'note-number text-fail' : 'note-number text-unknown'}>{status === 'FAIL' ? problems.indexOf(r)+1 : '?'}</span><span className="note-text"><span className="font-mono">{r.element_id}</span><strong>{r.check_name.toUpperCase()}</strong><span className="font-mono">{checkerMeasurement(r)} · {r.clause_ref.replace(' 2010','')}</span><span>{checkerFix(r)}</span>{changes && previous && <span>{revisionChange(r,previous.results)}</span>}</span></Button>)}</section>)}
          {show === 'ALL' && <details className="notes-passed"><summary>OK · {results.filter(r => r.status === 'PASS').length}</summary>{filtered.filter(r => r.status === 'PASS').map(r => <Button variant="ghost" data-note={r.id} className="checker-note" key={r.id} onClick={() => choose(r)}><span className="note-text"><span className="font-mono">{r.element_id}</span><strong>{r.check_name.toUpperCase()}</strong><span>{checkerMeasurement(r)}</span></span></Button>)}</details>}
          {!displayed.length && <p className="p-2 text-xs">No matching redlines.</p>}
          </div><Button variant="ghost" className="notes-required" onClick={() => setPanel('missing')}>REQUIRED MEASUREMENTS · {insp.questions.length}</Button>
        </>}
      </aside>
    </div>
    <footer className="checker-status"><span>{checked ? `${results.length} RULES · ${results.filter(r=>r.status==='FAIL').length} NONCONFORMITIES · ${results.filter(r=>r.status==='UNKNOWN').length} NOT VERIFIED · ${results.filter(r=>r.status==='PASS').length} OK` : 'DRAWING LOADED · CHECK NOT RUN'}</span><span>SCALE 1/8&quot; = 1&apos;-0&quot;</span><span>CURSOR X {cursor?.x.toFixed(3) ?? '—'} Y {cursor?.y.toFixed(3) ?? '—'}</span><span>{settings.demo ? 'MODEL: MISTRAL LOCAL · OFFLINE · DEMO' : 'API MODE · MODEL UNVERIFIED'}</span></footer>
  </div><PrintReport insp={insp}/></>;
}
