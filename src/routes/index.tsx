import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/AppShell";
import { api, DEMO_ID, qk } from "@/lib/api";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Inspections — ProvenAI" },
      { name: "description", content: "Past compliance inspections of ship design documents with PASS, FAIL and UNKNOWN counts." },
      { property: "og:title", content: "Inspections — ProvenAI" },
      { property: "og:description", content: "Past compliance inspections of ship design documents." },
    ],
  }),
  component: Inspections,
});

function Inspections() {
  useSettings();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["inspections", ...qk.all()], queryFn: api.inspections, refetchInterval: 3000 });
  return (
    <div>
      <PageHeader title="Inspections" sub="Each inspection checks uploaded design documents against selected rule sets."
        actions={<>
          <Button variant="outline" onClick={() => nav({ to: "/inspections/$id", params: { id: DEMO_ID } })}><FlaskConical className="h-4 w-4" />Load demo inspection</Button>
          <Button size="lg" asChild><Link to="/inspections/new"><Plus className="h-4 w-4" />New inspection</Link></Button>
        </>} />
      <div className="p-6">
        <div className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 text-right font-medium">Files</th>
                <th className="px-4 py-2 text-right font-medium text-pass">Pass</th><th className="px-4 py-2 text-right font-medium text-fail">Fail</th>
                <th className="px-4 py-2 text-right font-medium text-unknown">Unknown</th><th className="px-4 py-2 text-right font-medium text-review">Review</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading inspections…</td></tr>}
              {data?.map((i) => (
                <tr key={i.id} className="cursor-pointer border-t hover:bg-muted/50" onClick={() => nav({ to: "/inspections/$id", params: { id: i.id } })}>
                  <td className="px-4 py-2.5 font-medium">{i.name}<div className="font-mono text-[11px] text-muted-foreground">{i.id}</div></td>
                  <td className="px-4 py-2.5 font-mono text-xs tnum">{new Date(i.created_at).toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="px-4 py-2.5 text-right font-mono tnum">{i.file_count}</td>
                  <td className="px-4 py-2.5 text-right font-mono tnum">{i.status === "done" ? i.counts.pass : "–"}</td>
                  <td className="px-4 py-2.5 text-right font-mono tnum">{i.status === "done" ? i.counts.fail : "–"}</td>
                  <td className="px-4 py-2.5 text-right font-mono tnum">{i.status === "done" ? i.counts.unknown : "–"}</td>
                  <td className="px-4 py-2.5 text-right font-mono tnum">{i.status === "done" ? i.counts.review : "–"}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className={i.status === "done" ? "text-muted-foreground" : "font-medium text-primary"}>{i.status === "done" ? "Complete" : i.status === "error" ? "Error" : "Running…"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
