import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Plus, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/Status";
import { api, qk, type Rule } from "@/lib/api";
import { formatCondition } from "@/lib/rulesEngine";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Rule library — ProvenAI" },
      { name: "description", content: "Deterministic compliance rules translated from regulation text, each with edge-case self-tests." },
      { property: "og:title", content: "Rule library — ProvenAI" },
      { property: "og:description", content: "Regulation clauses translated into tested, human-approved checks." },
    ],
  }),
  component: Rules,
});

function TestsTable({ rule }: { rule: Rule }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
        <tr><th className="py-1.5">Test</th><th>Input</th><th>Expected</th><th>Actual</th><th /></tr>
      </thead>
      <tbody>
        {rule.tests.map((t) => (
          <tr key={t.name} className="border-t">
            <td className="py-1.5">{t.name}</td>
            <td className="font-mono">{t.input === null ? "missing" : t.input === "conflict" ? "2 sources disagree" : `${t.input} ${rule.condition.unit}`}</td>
            <td><StatusBadge status={t.expected} /></td>
            <td>{t.actual && <StatusBadge status={t.actual} />}</td>
            <td>{t.passed ? <CheckCircle2 className="h-4 w-4 text-pass" aria-label="passed" /> : <XCircle className="h-4 w-4 text-fail" aria-label="failed" />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RuleBody({ rule }: { rule: Rule }) {
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Clause · {rule.clause_ref}</h3>
        <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground">“{rule.clause_text}”</blockquote>
      </section>
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Deterministic check</h3>
        <code className="block rounded bg-muted px-2.5 py-1.5 font-mono">{formatCondition(rule)}</code>
        <p className="mt-1 text-xs text-muted-foreground">Applies to: {rule.applies_to}{rule.accessible_only ? " (accessible only)" : ""} · Inputs: <span className="font-mono">{rule.required_inputs.join(", ")}</span> · Missing or conflicting input ⇒ UNKNOWN</p>
      </section>
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Edge-case self-tests</h3>
        <TestsTable rule={rule} />
      </section>
    </div>
  );
}

function AddRule({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { data: sets } = useQuery({ queryKey: ["rulesets", ...qk.all()], queryFn: api.ruleSets });
  const [form, setForm] = useState({ text: "", clause_ref: "", rule_set_id: "ada-doors", applies_to: "door" as Rule["applies_to"], name: "" });
  const propose = useMutation({ mutationFn: () => api.proposeRule(form) });
  const approve = useMutation({
    mutationFn: (r: Rule) => api.approveRule(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rules"] }); toast.success("Rule approved and added to the library"); propose.reset(); onOpenChange(false); },
  });
  const res = propose.data;
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) propose.reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add rule from regulation text</DialogTitle>
          <DialogDescription>No code needed. The proposed check and its self-tests must be approved by an engineer before use.</DialogDescription>
        </DialogHeader>
        {!res?.ok ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Clause reference, e.g. ADA 2010 §404.2.4.1" value={form.clause_ref} onChange={(e) => setForm({ ...form, clause_ref: e.target.value })} />
              <Input placeholder="Check name, e.g. Maneuvering clearance" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={form.rule_set_id} onChange={(e) => setForm({ ...form, rule_set_id: e.target.value })} aria-label="Rule set">
                {sets?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value as Rule["applies_to"] })} aria-label="Applies to">
                <option value="door">Door</option><option value="cabin">Cabin</option><option value="corridor">Corridor</option>
              </select>
            </div>
            <Textarea rows={5} placeholder="Paste the verbatim clause, e.g. “Corridors on accessible routes shall have a clear width of at least 915 mm.”" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
            {res && !res.ok && <p className="rounded border border-unknown/40 bg-unknown-soft px-3 py-2 text-sm text-unknown">{res.error}</p>}
            <div className="flex justify-end"><Button disabled={!form.text.trim() || !form.clause_ref.trim() || propose.isPending} onClick={() => propose.mutate()}>{propose.isPending ? "Translating…" : "Propose check"}</Button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm"><span className="rounded bg-review-soft px-1.5 py-0.5 text-xs font-medium text-review">Proposed — awaiting approval</span>
              <span className="text-muted-foreground">{res.rule.tests.filter((t) => t.passed).length}/{res.rule.tests.length} self-tests passed</span></div>
            <RuleBody rule={res.rule} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { propose.reset(); toast("Proposal rejected — nothing was added"); }}><XCircle className="h-4 w-4" />Reject</Button>
              <Button onClick={() => approve.mutate(res.rule)} disabled={approve.isPending}><ShieldCheck className="h-4 w-4" />Approve rule</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Rules() {
  useSettings();
  const { data } = useQuery({ queryKey: ["rules", ...qk.all()], queryFn: api.rules });
  const [open, setOpen] = useState<Rule | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <PageHeader title="Rule library" sub="Regulation clauses translated into deterministic checks. New rules need no code — but always a human approval."
        actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add rule</Button>} />
      <div className="p-6">
        <div className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>{["Rule ID", "Rule set", "Clause", "Applies to", "Condition", "Inputs", "Self-test"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data?.map((r) => {
                const ok = r.tests.filter((t) => t.passed).length;
                return (
                  <tr key={r.id} className="cursor-pointer border-t hover:bg-muted/50" onClick={() => setOpen(r)}>
                    <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-2 text-xs">{r.rule_set}</td>
                    <td className="px-3 py-2 text-xs">{r.clause_ref}<div className="text-muted-foreground">{r.name}</div></td>
                    <td className="px-3 py-2 text-xs capitalize">{r.applies_to}{r.accessible_only ? " (acc.)" : ""}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatCondition(r)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.required_inputs.join(", ")}</td>
                    <td className="px-3 py-2 text-xs"><span className={ok === r.tests.length ? "inline-flex items-center gap-1 text-pass" : "inline-flex items-center gap-1 text-fail"}>
                      {ok === r.tests.length ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}<span className="font-mono tnum">{ok}/{r.tests.length}</span> passed</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-[520px] overflow-y-auto sm:max-w-[520px]">
          {open && <><SheetHeader><SheetTitle className="font-mono">{open.id}</SheetTitle><p className="text-sm text-muted-foreground">{open.rule_set} · {open.name}</p></SheetHeader><div className="mt-4 px-4"><RuleBody rule={open} /></div></>}
        </SheetContent>
      </Sheet>
      <AddRule open={adding} onOpenChange={setAdding} />
    </div>
  );
}
