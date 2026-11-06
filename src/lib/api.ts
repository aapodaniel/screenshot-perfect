// All API calls. Live mode talks to the on-premise REST API; demo mode (or any network error) uses src/lib/mockData.ts.
import { toast } from "sonner";
import * as mock from "./mockData";
import { getSettings } from "./settings";
import type { Answer, Inspection, InspectionSummary, Rule, RuleSet } from "./types";
export * from "./types";
export { DEMO_ID } from "./mockData";

let lastWarn = 0;
const base = () => getSettings().apiUrl.replace(/\/$/, "");
export const isDemo = () => getSettings().demo;

async function call<T>(live: (b: string) => Promise<T>, demo: () => Promise<T>): Promise<T> {
  if (isDemo()) return demo();
  try {
    return await live(base());
  } catch (e) {
    if (Date.now() - lastWarn > 15000) {
      lastWarn = Date.now();
      toast.warning("API unreachable — showing demo data", { description: `${base()}: ${(e as Error).message}` });
    }
    return demo();
  }
}
async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}
const post = <T,>(url: string, body: unknown) =>
  j<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const api = {
  /** Not wrapped: the status indicator needs the real outcome. */
  async health(): Promise<{ ok: boolean; mode: "demo" | "live" }> {
    if (isDemo()) return { ok: true, mode: "demo" };
    try { await j(`${base()}/health`); return { ok: true, mode: "live" }; } catch { return { ok: false, mode: "live" }; }
  },
  ruleSets: () => call<RuleSet[]>((b) => j(`${b}/rulesets`), mock.listRuleSets),
  rules: () => call<Rule[]>((b) => j(`${b}/rules`), mock.listRules),
  proposeRule: (input: Parameters<typeof mock.proposeRule>[0]) =>
    call((b) => post<Awaited<ReturnType<typeof mock.proposeRule>>>(`${b}/rules`, input), () => mock.proposeRule(input)),
  approveRule: (rule: Rule) => call((b) => post<Rule>(`${b}/rules/${encodeURIComponent(rule.id)}/approve`, rule), () => mock.approveRule(rule)),
  inspections: () => call<InspectionSummary[]>((b) => j(`${b}/inspections`), mock.listInspections),
  inspection: (id: string) => call<Inspection>((b) => j(`${b}/inspections/${id}`), () => mock.getInspection(id)),
  createInspection: (name: string, files: File[], ruleSetIds: string[]) =>
    call<{ id: string }>(
      (b) => {
        const fd = new FormData();
        fd.append("name", name);
        files.forEach((f) => fd.append("files", f));
        ruleSetIds.forEach((r) => fd.append("ruleset_ids", r));
        return j(`${b}/inspections`, { method: "POST", body: fd });
      },
      () => mock.createInspection(name, files, ruleSetIds),
    ),
  submitAnswers: (id: string, answers: Answer[]) =>
    call<Inspection>((b) => post(`${b}/inspections/${id}/answers`, { answers }), () => mock.submitAnswers(id, answers)),
  markReviewed: (id: string, rid: string) =>
    call<Inspection>((b) => post(`${b}/inspections/${id}/results/${encodeURIComponent(rid)}/review`, {}), () => mock.markReviewed(id, rid)),
  addNote: (id: string, rid: string, note: string) =>
    call<Inspection>((b) => post(`${b}/inspections/${id}/results/${encodeURIComponent(rid)}/notes`, { note }), () => mock.addNote(id, rid, note)),
  /** URL of an original file for the drawing viewer; null in demo mode. */
  fileUrl: (id: string, fileId: string) => (isDemo() ? null : `${base()}/inspections/${id}/files/${fileId}`),
};

export const qk = {
  all: () => [getSettings().demo, getSettings().apiUrl] as const,
};
