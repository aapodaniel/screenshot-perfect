import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Result, ShipElement, Status } from "@/lib/types";
import { drawingCallout } from "@/lib/presentation";
import { statusColorVar, statusRank } from "./Status";

const PAGE_W = 1191, PAGE_H = 842; // A3 landscape in PDF points

type VB = { x: number; y: number; w: number; h: number };

export function DrawingViewer({ elements, results, selectedElementId, onSelectElement, pdfUrl, fileName, selectedResult, onWhy, markerLimit }: {
  elements: ShipElement[]; results: Result[]; selectedElementId: string | null; onSelectElement: (id: string) => void;
  pdfUrl: string | null; fileName?: string | undefined;
  selectedResult?: Result | null; onWhy?: () => void; markerLimit?: number | undefined;
}) {
  const pages = useMemo(() => [...new Set(elements.map((e) => e.page))].sort((a, b) => a - b), [elements]);
  const [page, setPage] = useState(pages[0] ?? 1);
  const [pdfPages, setPdfPages] = useState<number[]>([]);
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
        if (!cancelled) setPdfPages(Array.from({ length: doc.numPages }, (_, i) => i + 1));
        const p = await doc.getPage(page);
        const vp1 = p.getViewport({ scale: 1 }), vp = p.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        await p.render({ canvasContext: context, viewport: vp }).promise;
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
    const aspect = (svgRef.current?.clientWidth ?? 640) / Math.max(svgRef.current?.clientHeight ?? 360, 1);
    const w = Math.max(x1 - x0 + 600, (y1 - y0 + 260) * aspect), h = w / aspect;
    const cx = (x0 + x1) / 2, cy = H - (y0 + y1) / 2;
    setVb({ x: cx - w / 2 + 90, y: cy - h / 2, w, h });
  }, [selectedElementId, img?.src]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const markerIds = ordered.filter((el) => worst.get(el.id) === "FAIL" || worst.get(el.id) === "UNKNOWN").sort((a, b) => (statusRank[worst.get(a.id) ?? "PASS"] - statusRank[worst.get(b.id) ?? "PASS"])).slice(0, markerLimit).map((el) => el.id);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="max-w-[240px] truncate text-muted-foreground">{fileName ?? "Drawing"}</span>
          {!img && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Demo drawing</span>}
        </div>
        <div className="flex items-center gap-1">
          <select value={page} onChange={(e) => setPage(+e.target.value)} className="h-7 rounded border bg-background px-1.5 font-mono text-xs" aria-label="Page">
            {(pdfPages.length ? pdfPages : pages.length ? pages : [1]).map((p) => <option key={p} value={p}>Page {p}</option>)}
          </select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoom(1 / 1.3)} aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoom(1.3)} aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVb(fit)} aria-label="Fit page"><Maximize className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <svg ref={svgRef} aria-label="Inspection drawing" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="block min-h-0 w-full flex-1 cursor-grab touch-none bg-canvas active:cursor-grabbing"
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
          const number = results.findIndex((r) => r.element_id === el.id) + 1;
          const marker = markerIds.includes(el.id);
          const cx = (x0 + x1) / 2, cy = H - (y0 + y1) / 2;
          const labelX = cx + 18, labelY = cy - 32;
          return (
            <g key={el.id} data-element={el.id} data-marker={marker ? st : undefined} opacity={selectedElementId && !sel && marker ? 0.5 : 1} onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }} className="cursor-pointer">
              <rect x={x0} y={H - y1} width={x1 - x0} height={y1 - y0} fill={color} fillOpacity={sel ? 0.12 : 0}
                stroke={sel || marker ? color : "var(--canvas-line)"} strokeOpacity={sel || marker ? 1 : 0.25} strokeDasharray={st === "UNKNOWN" ? "8 4" : undefined} strokeWidth={sel ? 4 : marker ? 2 : 1} vectorEffect="non-scaling-stroke" />
              {marker && number > 0 && <g><circle cx={cx} cy={cy} r={12} fill="var(--card)" stroke={color} strokeWidth={2} /><text x={cx} y={cy + 4} fontSize={11} fontFamily="JetBrains Mono, monospace" textAnchor="middle" fill={color}>{number}</text><rect x={labelX} y={labelY} width={el.id.length * 7 + 12} height={20} rx={2} fill="var(--card)" stroke="var(--border)" /><text x={labelX + 6} y={labelY + 14} fontSize={11} fontFamily="JetBrains Mono, monospace" fill="var(--foreground)">{el.id}</text></g>}
              {!marker && el.type === "cabin" && <text x={x0 + 6} y={H - y1 + 16} fontSize={12} fontFamily="JetBrains Mono, monospace" fill="var(--canvas-line)">{el.type === "cabin" ? el.space : el.id}</text>}
            </g>
          );
        })}
        {selectedResult && onWhy && (() => {
          const el = elements.find((e) => e.id === selectedResult.element_id);
          if (!el || el.page !== page) return null;
          const [x0, y0, x1, y1] = el.bbox;
          const cx = (x0 + x1) / 2, cy = H - (y0 + y1) / 2;
          const width = Math.min(260, vb.w * 0.42), height = Math.min(145, vb.h * 0.65);
          const x = Math.min(cx + 40, vb.x + vb.w - width - 12);
          const y = Math.max(vb.y + 12, cy - height / 2);
          return <g><line x1={cx + 14} y1={cy} x2={x} y2={y + height / 2} stroke={statusColorVar[selectedResult.status]} strokeWidth={2} />
            <foreignObject x={x} y={y} width={width} height={height} onPointerDown={(e) => e.stopPropagation()}>
              <div className="drawing-callout" data-status={selectedResult.status}>
                <p className="text-xs font-medium text-muted-foreground">Cabin {el.space}</p>
                <p className="mt-1 text-sm leading-5">{drawingCallout(selectedResult)}</p>
                <Button variant="link" size="sm" className="mt-1 h-6 p-0 text-sm" onClick={onWhy}>Why?</Button>
              </div>
            </foreignObject>
          </g>;
        })()}
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
