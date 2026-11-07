import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Result, ShipElement } from "@/lib/types";
import { drawingCallout } from "@/lib/presentation";
import { drawingSize, findingOverlay, normalizedPoint } from "@/lib/drawingOverlays";
import referenceDrawing from "@/assets/rcrv-deck01-cabins.png.asset.json";
import { statusColorVar, statusRank } from "./Status";

type VB = { x: number; y: number; w: number; h: number };
type Box = { x: number; y: number; w: number; h: number };

export function DrawingViewer({ elements, results, selectedElementId, onSelectElement, pdfUrl, fileName, selectedResult, onWhy, markerLimit, calibrate = false }: {
  elements: ShipElement[]; results: Result[]; selectedElementId: string | null; onSelectElement: (id: string, resultId?: string) => void;
  pdfUrl: string | null; fileName?: string | undefined;
  selectedResult?: Result | null; onWhy?: () => void; markerLimit?: number | undefined; calibrate?: boolean;
}) {
  const pages = useMemo(() => [...new Set(elements.map((e) => e.page))].sort((a, b) => a - b), [elements]);
  const [page, setPage] = useState(pages[0] ?? 1);
  const [pdfPages, setPdfPages] = useState<number[]>([]);
  const [img, setImg] = useState<{ src: string; w: number; h: number } | null>(null);
  const reference = !pdfUrl;
  const W = img?.w ?? drawingSize.width, H = img?.h ?? drawingSize.height;
  const fit: VB = { x: 0, y: 0, w: W, h: H };
  const [vb, setVb] = useState<VB>(fit);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vb: VB; moved: boolean } | null>(null);
  const wheelHandler = useRef<(e: WheelEvent) => void>(() => {});

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const resize = () => setSize({ w: svg.clientWidth, h: svg.clientHeight });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(svg);
    const wheel = (e: WheelEvent) => { e.preventDefault(); wheelHandler.current(e); };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => { observer.disconnect(); svg.removeEventListener("wheel", wheel); };
  }, []);

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

  function boxFor(r: Result): Box | null {
    if (reference) {
      const b = findingOverlay(r.id);
      return b ? { x: b.x0 * W, y: b.y0 * H, w: (b.x1 - b.x0) * W, h: (b.y1 - b.y0) * H } : null;
    }
    const el = elements.find((e) => e.id === r.element_id);
    if (!el || el.page !== page) return null;
    const [x0, y0, x1, y1] = el.bbox;
    return { x: x0, y: H - y1, w: x1 - x0, h: y1 - y0 };
  }
  const selectedBox = selectedResult ? boxFor(selectedResult) : null;

  useEffect(() => {
    if (!selectedResult) return;
    const el = elements.find((e) => e.id === selectedElementId);
    if (!reference && el && el.page !== page) { setPage(el.page); return; }
    const b = boxFor(selectedResult);
    if (!b) return;
    const aspect = size.w / Math.max(size.h, 1);
    const w = Math.max(W * 0.4, b.w * 3.2, b.h * 1.5 * aspect);
    const h = w / aspect;
    setVb({ x: b.x + b.w / 2 - w * 0.28, y: b.y + b.h / 2 - h * 0.54, w, h });
  }, [selectedResult?.id, img?.src, size.w, size.h, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const svgPoint = (clientX: number, clientY: number) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  };
  const zoom = (factor: number, anchor?: { x: number; y: number }) => setVb((v) => {
    const w = Math.min(W * 2, Math.max(W * 0.12, v.w * factor));
    const k = w / v.w;
    const p = anchor ?? { x: v.x + v.w / 2, y: v.y + v.h / 2 };
    return { x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w, h: v.h * k };
  });
  wheelHandler.current = (e) => {
    const p = svgPoint(e.clientX, e.clientY);
    if (!p) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.h : 1);
    zoom(Math.exp(Math.max(-300, Math.min(300, dy)) * 0.0015), p);
  };
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, vb, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
    if (!d.moved) return;
    const k = Math.max(d.vb.w / Math.max(size.w, 1), d.vb.h / Math.max(size.h, 1));
    setVb({ ...d.vb, x: d.vb.x - (e.clientX - d.x) * k, y: d.vb.y - (e.clientY - d.y) * k });
  };
  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (calibrate && !drag.current?.moved) {
      const p = svgPoint(e.clientX, e.clientY);
      if (p) setPoint(normalizedPoint(p.x, p.y, W, H));
    }
    drag.current = null;
  };

  const markers = [...results].filter((r) => r.status !== "PASS" && boxFor(r))
    .sort((a, b) => statusRank[a.status] - statusRank[b.status]).slice(0, markerLimit);
  // Shared geometry has one marker; selecting a different check still resolves its own box.
  const seen = new Set<string>();
  const shown = markers.filter((r) => {
    const b = boxFor(r), key = JSON.stringify(b);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).filter((r) => r.id !== selectedResult?.id);
  if (selectedResult && selectedResult.status !== "PASS" && selectedBox) shown.push(selectedResult);
  const unit = Math.max(vb.w / Math.max(size.w, 1), vb.h / Math.max(size.h, 1));
  const calloutPixels = Math.min(270, Math.max(155, size.w * 0.44));
  const calloutWidth = calloutPixels * unit, calloutHeight = 190 * unit;
  const calloutX = selectedBox ? Math.min(selectedBox.x + selectedBox.w + 26 * unit, vb.x + vb.w - calloutWidth - 12 * unit) : 0;
  const calloutY = selectedBox ? Math.max(vb.y + 16 * unit, Math.min(selectedBox.y + selectedBox.h / 2 - calloutHeight / 2, vb.y + vb.h - calloutHeight - 70 * unit)) : 0;
  const selectedElement = elements.find((e) => e.id === selectedElementId);

  return <div className="drawing-sheet flex h-full min-h-0 flex-col overflow-hidden bg-card">
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
      <span className="max-w-[300px] truncate text-xs text-muted-foreground">{reference ? "RCRV · Deck 01 · GA 6096-070-001" : fileName ?? "Drawing"}</span>
      <div className="flex items-center gap-1">
        {!reference && <select value={page} onChange={(e) => setPage(+e.target.value)} className="h-7 border bg-background px-1.5 font-mono text-xs" aria-label="Page">{(pdfPages.length ? pdfPages : pages.length ? pages : [1]).map((p) => <option key={p} value={p}>Page {p}</option>)}</select>}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoom(1 / 1.3)} aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoom(1.3)} aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVb(fit)} aria-label="Fit page"><Maximize className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
    <svg ref={svgRef} aria-label="Inspection drawing" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="block min-h-0 w-full flex-1 cursor-grab touch-none bg-canvas active:cursor-grabbing"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }} preserveAspectRatio="xMidYMid meet">
      {reference ? <image href={referenceDrawing.url} x={0} y={0} width={W} height={H} /> : img && <image href={img.src} x={0} y={0} width={W} height={H} />}
      {shown.map((r) => {
        const b = boxFor(r);
        if (!b) return null;
        const color = statusColorVar[r.status];
        return <g key={r.id} data-element={r.element_id} data-finding={r.id} data-marker={r.status} className="cursor-pointer"
          onPointerDown={(e) => { if (!calibrate) e.stopPropagation(); }}
          onClick={(e) => { if (!calibrate) { e.stopPropagation(); onSelectElement(r.element_id, r.id); } }}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" stroke={color} strokeWidth={r.status === "UNKNOWN" ? 1 : 2} strokeDasharray={r.status === "UNKNOWN" ? "6 4" : undefined} vectorEffect="non-scaling-stroke" />
          {r.status === "UNKNOWN" && <g><rect x={b.x} y={b.y} width={18 * unit} height={20 * unit} fill="var(--card)" stroke={color} vectorEffect="non-scaling-stroke" /><text x={b.x + 9 * unit} y={b.y + 14 * unit} textAnchor="middle" fontSize={12 * unit} fill={color}>?</text></g>}
        </g>;
      })}
      {selectedResult && selectedBox && onWhy && <g data-callout={selectedResult.id}>
        <line x1={selectedBox.x + selectedBox.w} y1={selectedBox.y + selectedBox.h / 2} x2={calloutX} y2={calloutY + 30 * unit} stroke={statusColorVar[selectedResult.status]} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <foreignObject x={calloutX} y={calloutY} width={calloutWidth} height={calloutHeight} onPointerDown={(e) => e.stopPropagation()}>
          <div className="drawing-callout-host" style={{ width: calloutPixels, transform: `scale(${unit})`, transformOrigin: "0 0" }}>
            <div className="drawing-callout" data-status={selectedResult.status}>
              <p className="text-[11px] font-semibold">{selectedResult.element_id}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Cabin {selectedElement?.space}</p>
              <p className="mt-2 text-xs leading-4">{drawingCallout(selectedResult)}</p>
              <Button variant="link" size="sm" className="mt-1 h-6 p-0" onClick={onWhy}>Why?</Button>
            </div>
          </div>
        </foreignObject>
      </g>}
      {calibrate && point && <g pointerEvents="none"><path d={`M ${point.x * W - 8 * unit} ${point.y * H} h ${16 * unit} M ${point.x * W} ${point.y * H - 8 * unit} v ${16 * unit}`} stroke="var(--foreground)" vectorEffect="non-scaling-stroke" /></g>}
    </svg>
    {calibrate && <output aria-label="Calibration coordinates" className="calibration-coordinates">{point ? `x ${point.x.toFixed(4)} · y ${point.y.toFixed(4)}` : "Calibration · x — · y —"}</output>}
    {reference && <table className="drawing-title-block" aria-label="Drawing title block"><tbody>
      <tr><td>VESSEL</td><td>RCRV</td></tr>
      <tr><td>DRAWING</td><td>GA 6096-070-001</td></tr>
      <tr><td>REV</td><td>J</td></tr>
      <tr><td>SCALE</td><td>1/8&quot; = 1&apos;-0&quot;</td></tr>
      <tr><td>CHECKED BY</td><td>ProvenAI · DEMO</td></tr>
    </tbody></table>}
  </div>;
}
