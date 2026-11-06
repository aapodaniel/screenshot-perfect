import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Result, ShipElement, Status } from "@/lib/types";
import { statusColorVar, statusRank } from "./Status";

const PAGE_W = 1191, PAGE_H = 842; // A3 landscape in PDF points

type VB = { x: number; y: number; w: number; h: number };

export function DrawingViewer({ elements, results, selectedElementId, onSelectElement, pdfUrl, fileName }: {
  elements: ShipElement[]; results: Result[]; selectedElementId: string | null; onSelectElement: (id: string) => void;
  pdfUrl: string | null; fileName?: string | undefined;
}) {
  const pages = useMemo(() => [...new Set(elements.map((e) => e.page))].sort((a, b) => a - b), [elements]);
  const [page, setPage] = useState(pages[0] ?? 1);
  const [img, setImg] = useState<{ src: string; w: number; h: number } | null>(null);
  const W = img?.w ?? PAGE_W, H = img?.h ?? PAGE_H;
  const fit: VB = { x: 0, y: 0, w: W, h: H };
  const [vb, setVb] = useState<VB>(fit);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vb: VB } | null>(null);

  const worst = useMemo(() => {
    const m = new Map<string, Status>();
    for (const r of results) { const cur = m.get(r.element_id); if (!cur || statusRank[r.status] < statusRank[cur]) m.set(r.element_id, r.status); }
    return m;
  }, [results]);

  // Render the PDF page with pdf.js when a real file is available.
  useEffect(() => {
    if (!pdfUrl) { setImg(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const doc = await pdfjs.getDocument(pdfUrl).promise;
        const p = await doc.getPage(page);
        const vp1 = p.getViewport({ scale: 1 }), vp = p.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await p.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        if (!cancelled) { setImg({ src: canvas.toDataURL(), w: vp1.width, h: vp1.height }); setVb({ x: 0, y: 0, w: vp1.width, h: vp1.height }); }
      } catch { if (!cancelled) setImg(null); }
    })();
    return () => { cancelled = true; };
  }, [pdfUrl, page]);

  // Zoom to the selected element.
  useEffect(() => {
    const el = elements.find((e) => e.id === selectedElementId);
    if (!el) return;
    if (el.page !== page) setPage(el.page);
    const [x0, y0, x1, y1] = el.bbox;
    const w = Math.max((x1 - x0) * 3.5, 360), h = w * (H / W);
    const cx = (x0 + x1) / 2, cy = H - (y0 + y1) / 2;
    setVb({ x: cx - w / 2, y: cy - h / 2, w, h });
  }, [selectedElementId]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (f: number) => setVb((v) => { const w = Math.min(W * 1.5, Math.max(80, v.w * f)), h = w * (H / W); return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h }; });
  const onWheel = (e: React.WheelEvent) => { zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15); };
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, vb }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current, svg = svgRef.current; if (!d || !svg) return;
    const k = d.vb.w / svg.clientWidth;
    setVb({ ...d.vb, x: d.vb.x - (e.clientX - d.x) * k, y: d.vb.y - (e.clientY - d.y) * k });
  };
  const visible = elements.filter((e) => e.page === page);
  const ordered = [...visible].sort((a, b) => (a.type === "cabin" ? -1 : 1) - (b.type === "cabin" ? -1 : 1));

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground">{fileName ?? "Drawing"}</span>
          {!img && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Schematic from bboxes</span>}
        </div>
        <div className="flex items-center gap-1">
          <select value={page} onChange={(e) => setPage(+e.target.value)} className="h-7 rounded border bg-background px-1.5 font-mono text-xs" aria-label="Page">
            {pages.map((p) => <option key={p} value={p}>Page {p}</option>)}
          </select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoom(1 / 1.3)} aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoom(1.3)} aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVb(fit)} aria-label="Fit page"><Maximize className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="block h-[340px] w-full cursor-grab touch-none bg-canvas active:cursor-grabbing"
        onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="var(--canvas-line)" strokeOpacity="0.08" /></pattern>
        </defs>
        {img ? <image href={img.src} x={0} y={0} width={W} height={H} /> : <Schematic />}
        {ordered.map((el) => {
          const [x0, y0, x1, y1] = el.bbox;
          const st = worst.get(el.id);
          const color = st ? statusColorVar[st] : "var(--muted-foreground)";
          const sel = el.id === selectedElementId;
          return (
            <g key={el.id} onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }} className="cursor-pointer">
              <rect x={x0} y={H - y1} width={x1 - x0} height={y1 - y0} fill={color} fillOpacity={el.type === "cabin" ? 0.1 : 0.3}
                stroke={color} strokeWidth={sel ? 5 : 1.5} className={sel ? "bbox-selected" : undefined} />
              <text x={x0 + 6} y={el.type === "cabin" ? H - y1 + 16 : H - y0 + 14} fontSize={el.type === "cabin" ? 12 : 9}
                fontFamily="JetBrains Mono, monospace" fill="var(--canvas-line)">{el.type === "cabin" ? el.space : el.id}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Schematic() {
  const H = PAGE_H;
  const y = (v: number) => H - v;
  const line = "var(--canvas-line)";
  return (
    <g>
      <rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill="url(#grid)" />
      {/* hull outline, deck 1 plan */}
      <path d={`M80 ${y(420)} L980 ${y(380)} Q1130 ${y(421)} 980 ${y(700)} L80 ${y(660)} Z`} fill="none" stroke={line} strokeWidth={2} />
      {/* corridor */}
      <rect x={300} y={y(470)} width={680} height={45} fill="none" stroke={line} strokeOpacity={0.5} strokeDasharray="6 4" />
      <text x={310} y={y(440)} fontSize={10} fill={line} fontFamily="JetBrains Mono, monospace">CORRIDOR 01-C1</text>
      {/* stairs + mess as context */}
      <rect x={140} y={y(640)} width={160} height={170} fill="none" stroke={line} strokeOpacity={0.5} />
      <text x={150} y={y(620)} fontSize={11} fill={line} fontFamily="JetBrains Mono, monospace">MESS 01-30</text>
      {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={1000 - i * 0} x2={1060} y1={y(500 + i * 14)} y2={y(500 + i * 14)} stroke={line} strokeOpacity={0.4} />)}
      {Array.from({ length: 23 }).map((_, i) => (
        <g key={i}><line x1={120 + i * 40} x2={120 + i * 40} y1={y(372)} y2={y(362)} stroke={line} strokeOpacity={0.6} />
          {i % 2 === 0 && <text x={116 + i * 40} y={y(348)} fontSize={8} fill={line} fontFamily="JetBrains Mono, monospace">{26 + i}</text>}</g>
      ))}
      <text x={80} y={y(100)} fontSize={11} fill={line} fontFamily="JetBrains Mono, monospace" opacity={0.7}>GENERAL ARRANGEMENT · DECK 1 · FR 26–48 · SHEET 10/24</text>
      <line x1={80} x2={280} y1={y(130)} y2={y(130)} stroke={line} strokeWidth={2} />
      <text x={80} y={y(140)} fontSize={9} fill={line} fontFamily="JetBrains Mono, monospace">0          5 m</text>
    </g>
  );
}
