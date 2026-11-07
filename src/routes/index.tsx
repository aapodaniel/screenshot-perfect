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
      <p className="text-sm font-medium text-primary">ProvenAI · Ship design checking</p>
      <h1 className="max-w-3xl text-[32px] font-medium leading-tight">Check a ship design against the rules — in one click.</h1>
      <p className="max-w-3xl text-base leading-6 text-muted-foreground">ProvenAI finds violations, shows where they are in the drawing, and tells you what it cannot check.</p>
    </header>
    <div className="relative mt-6 flex min-h-0 flex-1 flex-col overflow-hidden border bg-card">
      {inspection ? <DrawingViewer elements={inspection.elements} results={phase >= 3 ? inspection.results : []} markerLimit={phase >= 3 ? phase - 2 : 0} selectedElementId={null} onSelectElement={() => {}} pdfUrl={null} fileName="Deck 01 · Cabins · Demo drawing" /> : <div className="grid flex-1 place-items-center text-muted-foreground">Loading drawing…</div>}
      <div className="absolute inset-x-0 bottom-8 flex justify-center px-4">
        {checking ? <div role="status" className="flex max-w-full flex-wrap items-center justify-center gap-3 border bg-card px-5 py-4 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span>{phase === 0 ? "Reading drawing…" : phase === 1 ? "Finding doors and cabins…" : "Checking 14 rules…"}</span></div> : <Button size="lg" className="h-14 px-8 text-base" disabled={!inspection} onClick={() => { setPhase(0); setChecking(true); }}><ScanLine className="h-5 w-5" />Check this design<ArrowRight className="h-5 w-5" /></Button>}
      </div>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm">
      <span className="text-xs text-muted-foreground">Demo inspection · Deck 01 cabins</span>
      <Button asChild variant="link" className="h-auto p-0 font-normal"><Link to="/inspections/new">Upload your own drawing<ArrowRight className="h-4 w-4" /></Link></Button>
    </footer>
  </div>;
}
