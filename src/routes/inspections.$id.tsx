import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Download, FileJson, Loader2, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/app/AppShell";
import { StatCards } from "@/components/app/StatCards";
import { ResultsTable } from "@/components/app/ResultsTable";
import { EvidenceChain } from "@/components/app/EvidenceChain";
import { DrawingViewer } from "@/components/app/DrawingViewer";
import { QuestionList } from "@/components/app/QuestionList";
import { MeasurementsTable } from "@/components/app/MeasurementsTable";
import { PrintReport } from "@/components/app/PrintReport";
import { statusRank } from "@/components/app/Status";
import { api, qk, type Inspection } from "@/lib/api";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inspections/$id")({
  head: () => ({
    meta: [
      { title: "Inspection result — ProvenAI" },
      { name: "description", content: "Compliance results with the full evidence chain for every check." },
      { property: "og:title", content: "Inspection result — ProvenAI" },
      { property: "og:description", content: "PASS / FAIL / UNKNOWN results with regulation, logic, evidence and decision." },
    ],
  }),
  component: InspectionPage,
});

const STEPS = ["Ingesting documents", "Extracting evidence", "Evaluating rules", "Done"];

function Progress({ insp }: { insp: Inspection }) {
  return (
    <div className="mx-auto max-w-lg p-10">
      <h2 className="text-base font-semibold">Running check…</h2>
      <p className="text-sm text-muted-foreground">{insp.files.length} files · {insp.rule_set_ids.length} rule sets</p>
      <ol className="mt-6 space-y-3">
        {STEPS.map((s, i) => {
          const n = i + 1, done = insp.progress.step > n || insp.status === "done", cur = insp.progress.step === n;
          return (
            <li key={s} className={cn("flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm", cur && "border-primary")}>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full border", done && "border-pass bg-pass-soft text-pass", cur && "border-primary text-primary")}>
                {done ? <Check className="h-3.5 w-3.5" /> : cur ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="font-mono text-[10px]">{n}</span>}
              </span>
              <span className={cn(!done && !cur && "text-muted-foreground")}>{s}</span>
              {i === 1 && cur && <span className="ml-auto text-xs text-muted-foreground">local model · no data leaves the network</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function InspectionPage() {
  const { id } = Route.useParams();
  useSettings();
  const qc = useQueryClient();
  const key = ["inspection", id, ...qk.all()];
  const { data: insp, error } = useQuery({
    queryKey: key, queryFn: () => api.inspection(id),
    refetchInterval: (q) => (q.state.data?.status === "done" ? false : 1000),
  });
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState({ status: "all", ruleSet: "all", type: "all", deck: "all", q: "" });
  const setData = (d: Inspection) => qc.setQueryData(key, d);
  const answers = useMutation({ mutationFn: (a: Parameters<typeof api.submitAnswers>[1]) => api.submitAnswers(id, a), onSuccess: (d) => { setData(d); toast.success("Re-checked with your values"); } });
  const review = useMutation({ mutationFn: (rid: string) => api.markReviewed(id, rid), onSuccess: setData });
  const note = useMutation({ mutationFn: ({ rid, n }: { rid: string; n: string }) => api.addNote(id, rid, n), onSuccess: setData });

  const rows = useMemo(() => {
    if (!insp) return [];
    const q = f.q.toLowerCase();
    return insp.results
      .filter((r) => {
        const el = insp.elements.find((e) => e.id === r.element_id);
        return (f.status === "all" || (f.status === "REVIEW" ? r.needs_review : r.status === f.status)) &&
          (f.ruleSet === "all" || r.rule_set === f.ruleSet) && (f.type === "all" || el?.type === f.type) && (f.deck === "all" || el?.space === f.deck) &&
          (!q || [r.check_name, r.element_id, r.clause_ref, el?.name].join(" ").toLowerCase().includes(q));
      })
      .sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.element_id.localeCompare(b.element_id));
  }, [insp, f]);

  if (error) return <div className="p-10 text-sm">Inspection not found. <Link to="/" className="text-primary underline">Back to inspections</Link></div>;
  if (!insp) return <div className="p-10 text-sm text-muted-foreground">Loading inspection…</div>;
  if (insp.status !== "done") return <><PageHeader title={insp.name} sub={insp.project} /><Progress insp={insp} /></>;

  const selected = insp.results.find((r) => r.id === sel) ?? null;
  const pdf = insp.files.find((x) => x.type === "application/pdf");
  const uniq = (xs: string[]) => [...new Set(xs)];
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(insp, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${insp.id}-report.json`; a.click();
  };
  const selects = [
    { k: "status", label: "Status", opts: [["all", "All statuses"], ["FAIL", "FAIL"], ["UNKNOWN", "UNKNOWN"], ["PASS", "PASS"], ["REVIEW", "Needs review"]] },
    { k: "ruleSet", label: "Rule set", opts: [["all", "All rule sets"], ...uniq(insp.results.map((r) => r.rule_set)).map((x) => [x, x])] },
    { k: "type", label: "Element type", opts: [["all", "All elements"], ...uniq(insp.elements.map((e) => e.type)).map((x) => [x, x.charAt(0).toUpperCase() + x.slice(1)])] },
    { k: "deck", label: "Space", opts: [["all", "All spaces"], ...uniq(insp.elements.map((e) => e.space)).map((x) => [x, `${x} · Deck 1`])] },
  ] as const;

  return (
    <div>
      <div className="no-print">
        <PageHeader title={insp.name} sub={<>{insp.project} · <span className="font-mono">{insp.files.length} files</span></>}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline"><Download className="h-4 w-4" />Download report</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportJson}><FileJson className="h-4 w-4" />JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}><Printer className="h-4 w-4" />Printable report / PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          } />
        <div className="space-y-4 p-6">
          <StatCards results={insp.results} />
          <Tabs defaultValue="results">
            <TabsList>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="missing">Missing information <span className="ml-1.5 rounded bg-unknown-soft px-1.5 font-mono text-[10px] text-unknown">{insp.questions.length}</span></TabsTrigger>
              <TabsTrigger value="measurements">Measurements</TabsTrigger>
            </TabsList>
            <TabsContent value="results" className="mt-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {selects.map((s) => (
                  <select key={s.k} aria-label={s.label} value={f[s.k]} onChange={(e) => setF((v) => ({ ...v, [s.k]: e.target.value }))}
                    className="h-8 rounded-md border bg-card px-2 text-sm">
                    {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ))}
                <div className="relative ml-auto w-64">
                  <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                  <Input value={f.q} onChange={(e) => setF((v) => ({ ...v, q: e.target.value }))} placeholder="Search check, element, clause" className="h-8 pl-8" />
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_420px] items-start gap-4">
                <div className="space-y-4">
                  <DrawingViewer elements={insp.elements} results={insp.results} selectedElementId={selected?.element_id ?? null}
                    onSelectElement={(eid) => { const r = rows.find((x) => x.element_id === eid) ?? insp.results.find((x) => x.element_id === eid); if (r) setSel(r.id); }}
                    pdfUrl={pdf ? api.fileUrl(insp.id, pdf.id) : null} fileName={pdf ? `${pdf.name} · p.10` : undefined} />
                  <ResultsTable results={rows} elements={insp.elements} selectedId={sel} onSelect={(r) => setSel(r.id)} />
                </div>
                <div className="sticky top-16 h-[calc(100vh-5rem)] overflow-hidden rounded-md border bg-card">
                  {selected ? (
                    <EvidenceChain key={selected.id} result={selected} element={insp.elements.find((e) => e.id === selected.element_id)}
                      onClose={() => setSel(null)} onReviewed={() => review.mutate(selected.id)} onNote={(n) => note.mutate({ rid: selected.id, n })} />
                  ) : (
                    <div className="grid h-full place-items-center p-8 text-center">
                      <div>
                        <p className="text-sm font-medium">Select a check to see its evidence chain</p>
                        <p className="mt-1 text-xs text-muted-foreground">Regulation → check logic → extracted evidence → decision → action → audit trail.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="missing" className="mt-3 max-w-4xl">
              <p className="mb-3 text-sm text-muted-foreground">Ranked by how many UNKNOWN checks each answer resolves. Values you enter are logged as engineer input in the audit trail.</p>
              <QuestionList questions={insp.questions} elements={insp.elements} busy={answers.isPending} onRecheck={(a) => answers.mutate(a)} />
            </TabsContent>
            <TabsContent value="measurements" className="mt-3"><MeasurementsTable elements={insp.elements} /></TabsContent>
          </Tabs>
        </div>
      </div>
      <PrintReport insp={insp} />
    </div>
  );
}
