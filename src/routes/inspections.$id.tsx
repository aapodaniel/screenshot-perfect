import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Download, FileJson, Loader2, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/app/AppShell";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { InspectionStepper } from "@/components/app/InspectionStepper";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Inspection result — ProvenAI" },
      { name: "description", content: "Ship drawing violations, required measurements and clear explanations for every check." },
      { property: "og:title", content: "Inspection result — ProvenAI" },
      { property: "og:description", content: "See doors that are too narrow on the drawing, with the rule and the fix." },
    ],
  }),
  component: InspectionPage,
});

const STEPS = ["Reading drawing", "Finding doors and cabins", "Checking rules", "Done"];

function Progress({ insp }: { insp: Inspection }) {
  return (
    <div className="mx-auto max-w-lg p-10">
      <h2 className="text-base font-semibold">Running check…</h2>
      <p className="text-sm text-muted-foreground">{insp.files.length} files · {insp.rule_set_ids.length} groups of rules</p>
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
  const [whyOpen, setWhyOpen] = useState(false);
  const [updated, setUpdated] = useState(0);
  const [showChanges, setShowChanges] = useState(false);
  const { data: previous } = useQuery({ queryKey: ["inspection", insp?.previous_revision?.id, ...qk.all()], queryFn: () => api.inspection(insp?.previous_revision?.id ?? ""), enabled: !!insp?.previous_revision });
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState({ status: "all", q: "" });
  const setData = (d: Inspection) => qc.setQueryData(key, d);
  const answers = useMutation({ mutationFn: (a: Parameters<typeof api.submitAnswers>[1]) => api.submitAnswers(id, a), onSuccess: (d) => { setData(d); setUpdated((v) => v + 1); toast.success("Checks updated with your measurement"); } });
  const review = useMutation({ mutationFn: (rid: string) => api.markReviewed(id, rid), onSuccess: setData });
  const note = useMutation({ mutationFn: ({ rid, n }: { rid: string; n: string }) => api.addNote(id, rid, n), onSuccess: setData });

  useEffect(() => {
    if (insp?.status === "done" && !sel) {
      const first = [...insp.results].sort((a, b) => statusRank[a.status] - statusRank[b.status] || (a.element_id === "D-01-36-2" ? -1 : b.element_id === "D-01-36-2" ? 1 : a.element_id.localeCompare(b.element_id)))[0];
      if (first) setSel(first.id);
    }
  }, [insp?.id, insp?.status]);
  const selectResult = (rid: string) => setSel(rid);
  const rows = useMemo(() => {
    if (!insp) return [];
    const q = f.q.toLowerCase();
    return insp.results
      .filter((r) => {
        const el = insp.elements.find((e) => e.id === r.element_id);
        return (f.status === "all" || r.status === f.status) &&
          (!q || [r.check_name, r.element_id, r.clause_ref, el?.name].join(" ").toLowerCase().includes(q));
      })
      .sort((a, b) => statusRank[a.status] - statusRank[b.status] || (a.element_id === "D-01-36-2" ? -1 : b.element_id === "D-01-36-2" ? 1 : a.element_id.localeCompare(b.element_id)));
  }, [insp, f]);

  if (error) return <div className="p-10 text-sm">Inspection not found. <Link to="/" className="text-primary underline">Back to design check</Link></div>;
  if (!insp) return <div className="p-10 text-sm text-muted-foreground">Loading inspection…</div>;
  if (insp.status !== "done") return <><InspectionStepper step={3} /><PageHeader title={insp.name} sub={insp.project} /><Progress insp={insp} /></>;

  const selected = insp.results.find((r) => r.id === sel) ?? null;
  const pdf = insp.files.find((x) => x.type === "application/pdf");
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(insp, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${insp.id}-report.json`; a.click();
  };
  return (
    <div>
      <div className="inspection-result-page no-print">
        <header className="inspection-result-header">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <h1 className="min-w-0 text-2xl font-medium">{insp.name}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="shrink-0"><Download className="h-4 w-4" />Download report</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportJson}><FileJson className="h-4 w-4" />JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}><Printer className="h-4 w-4" />Printable report / PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <StatCards results={insp.results} source={insp.name.replace(" accommodation", "")} updated={updated} activeStatus={f.status} onStatus={(status) => setF((v) => ({ ...v, status: v.status === status ? "all" : status }))} />
        </header>
        <Tabs defaultValue="results" className="inspection-result-tabs">
          <TabsList className="h-9 shrink-0 justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="results" className="h-9 rounded-none px-4">Findings</TabsTrigger>
            <TabsTrigger value="missing" className="h-9 rounded-none px-4">Need more information <span className="ml-1.5 font-mono text-xs text-muted-foreground">{insp.questions.length}</span></TabsTrigger>
            <TabsTrigger value="measurements" className="h-9 rounded-none px-4">Measurements</TabsTrigger>
          </TabsList>
          <TabsContent value="results" className="inspection-workspace mt-4 min-h-0 flex-1">
            <div className="flex min-h-0 min-w-0 flex-col border-r bg-card">
              <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-3">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                  <Input aria-label="Search findings" value={f.q} onChange={(e) => setF((v) => ({ ...v, q: e.target.value }))} placeholder="Search findings" className="h-8 pl-8 text-xs" />
                </div>
                {insp.previous_revision && <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground" title={`Show changes since ${insp.previous_revision.label}`}><Switch className="h-4 w-7 [&_span]:h-3 [&_span]:w-3 [&_span]:data-[state=checked]:translate-x-3" checked={showChanges} onCheckedChange={setShowChanges} aria-label={`Show changes since ${insp.previous_revision.label}`} />Changes since {insp.previous_revision.label}</label>}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto"><ResultsTable results={rows} elements={insp.elements} selectedId={sel} onSelect={(r) => selectResult(r.id)} previous={previous?.results} showChanges={showChanges} expandPassed={f.status === "PASS"} /></div>
            </div>
            <div className="inspection-drawing-details">
              <DrawingViewer elements={insp.elements} results={insp.results} selectedElementId={selected?.element_id ?? null}
                selectedResult={selected} onWhy={() => setWhyOpen(true)}
                onSelectElement={(eid) => { const r = rows.find((x) => x.element_id === eid) ?? insp.results.find((x) => x.element_id === eid); if (r) selectResult(r.id); }}
                pdfUrl={pdf ? api.fileUrl(insp.id, pdf.id) : null} fileName={pdf?.name} />
            </div>
          </TabsContent>
          <TabsContent value="missing" className="mt-4 min-h-0 flex-1 overflow-y-auto">
            <QuestionList questions={insp.questions} elements={insp.elements} busy={answers.isPending} onRecheck={(a) => answers.mutate(a)} />
          </TabsContent>
          <TabsContent value="measurements" className="mt-4 min-h-0 flex-1 overflow-y-auto"><MeasurementsTable elements={insp.elements} /></TabsContent>
        </Tabs>
      </div>
      <Dialog open={whyOpen} onOpenChange={setWhyOpen}>
        <DialogContent className="flex h-[min(680px,85dvh)] max-w-5xl flex-col overflow-hidden p-0 pt-5">
          <DialogTitle className="px-4 text-base font-medium">Why this finding?</DialogTitle>
          <DialogDescription className="sr-only">The rule, measurement source and explanation, with review and notes.</DialogDescription>
          {selected && <EvidenceChain key={selected.id} result={selected} element={insp.elements.find((e) => e.id === selected.element_id)} onClose={() => setWhyOpen(false)} onReviewed={() => review.mutate(selected.id)} onNote={(n) => note.mutate({ rid: selected.id, n })} />}
        </DialogContent>
      </Dialog>
      <PrintReport insp={insp} />
    </div>
  );
}
