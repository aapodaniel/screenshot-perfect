import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Server, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/app/AppShell";
import { api } from "@/lib/api";
import { setSettings, useSettings } from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Settings — ProvenAI" },
      { name: "description", content: "Configure the on-premise API connection and demo data mode." },
      { property: "og:title", content: "Settings — ProvenAI" },
      { property: "og:description", content: "API connection, demo mode and deployment information." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useSettings();
  const [url, setUrl] = useState(s.apiUrl);
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid max-w-5xl grid-cols-[1fr_340px] gap-6 p-6">
        <div className="space-y-4">
          <section className="rounded-md border bg-card p-4">
            <label htmlFor="api" className="text-sm font-medium">API base URL</label>
            <p className="text-xs text-muted-foreground">Saved in this browser.</p>
            <div className="mt-2 flex gap-2">
              <Input id="api" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
              <Button onClick={async () => { setSettings({ apiUrl: url }); const h = await api.health(); toast[h.ok || s.demo ? "success" : "warning"](s.demo ? "Saved — demo data is on" : h.ok ? `Connected to ${url}` : `Saved, but ${url} is not reachable`); }}>Save & test</Button>
            </div>
          </section>
          <section className="flex items-center justify-between rounded-md border bg-card p-4">
            <div><div className="text-sm font-medium">Use demo data</div><p className="text-xs text-muted-foreground">Built-in example vessel. Also used automatically if the API cannot be reached.</p></div>
            <Switch checked={s.demo} onCheckedChange={(v) => setSettings({ demo: v })} aria-label="Use demo data" />
          </section>
        </div>
        <aside className="space-y-3 rounded-md border bg-card p-4 text-sm">
          <h2 className="font-semibold">Deployment</h2>
          {[
            [Server, "Runs fully on-premise inside the shipyard network."],
            [ShieldCheck, "Local EU language model (Mistral via Ollama). No cloud AI."],
            [Lock, "No data leaves the network. Drawings and specs are never uploaded externally."],
          ].map(([I, t], i) => { const Icon = I as typeof Server; return <p key={i} className="flex gap-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t as string}</p>; })}
          <p className="border-t pt-3 text-xs text-muted-foreground">The model only extracts evidence. Every PASS / FAIL is decided by versioned, tested deterministic rules.</p>
        </aside>
      </div>
    </div>
  );
}
