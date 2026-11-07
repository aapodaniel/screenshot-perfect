import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawingViewer } from "@/components/app/DrawingViewer";
import { api, DEMO_ID, qk } from "@/lib/api";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Check a ship design — ProvenAI" },
    { name: "description", content: "Check a ship drawing against engineering rules. See door violations on the drawing and what needs more information." },
    { property: "og:title", content: "Check a ship design — ProvenAI" },
    { property: "og:description", content: "One-click ship design checking, with clear violations and their reasons." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: DesignCheck,
});

function DesignCheck() {
  useSettings();
  const navigate = useNavigate();
  const { data: inspection } = useQuery({ queryKey: ["inspection", DEMO_ID, ...qk.all()], queryFn: () => api.inspection(DEMO_ID) });
  const [checking, setChecking] = useState(false);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!checking) return;
    const timers = [window.setTimeout(() => setPhase(1), 700), window.setTimeout(() => setPhase(2), 1400), window.setTimeout(() => setPhase(3), 1850), window.setTimeout(() => setPhase(4), 2000), window.setTimeout(() => setPhase(5), 2150), window.setTimeout(() => setPhase(6), 2300), window.setTimeout(() => setPhase(7), 2450), window.setTimeout(() => navigate({ to: "/inspections/$id", params: { id: DEMO_ID } }), 2600)];
    return () => timers.forEach(window.clearTimeout);
  }, [checking, navigate]);
  return <div className="design-home">
    <header className="space-y-3">
      <h1 className="text-2xl font-semibold leading-tight">Check a ship design against the rules.</h1>
      <p className="max-w-3xl text-sm leading-5 text-muted-foreground">ProvenAI finds violations, shows where they are in the drawing, and tells you what it cannot check.</p>
    </header>
    <div className="relative mt-6 flex min-h-0 flex-1 flex-col overflow-hidden border bg-card">
      {inspection ? <DrawingViewer elements={inspection.elements} results={phase >= 3 ? inspection.results : []} markerLimit={phase >= 3 ? phase - 2 : 0} selectedElementId={null} onSelectElement={() => {}} pdfUrl={null} fileName="Deck 01 · Cabins · Demo drawing" /> : <div className="grid flex-1 place-items-center text-muted-foreground">Loading drawing…</div>}
      <div className="absolute left-4 bottom-4 flex px-0">
        {checking ? <div role="status" className="flex h-8 max-w-full items-center gap-2 border bg-card px-3 text-xs"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span>{phase === 0 ? "Reading drawing…" : phase === 1 ? "Finding doors and cabins…" : "Checking 14 rules…"}</span></div> : <Button size="lg" disabled={!inspection} onClick={() => { setPhase(0); setChecking(true); }}><ScanLine className="h-4 w-4" />Check this design<ArrowRight className="h-4 w-4" /></Button>}
      </div>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm">
      <span className="text-xs text-muted-foreground">Demo inspection · Deck 01 cabins</span>
      <Button asChild variant="link" className="h-auto p-0 font-normal"><Link to="/inspections/new">Upload your own drawing<ArrowRight className="h-4 w-4" /></Link></Button>
    </footer>
  </div>;
}
