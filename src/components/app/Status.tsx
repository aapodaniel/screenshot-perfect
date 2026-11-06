import { CheckCircle2, CircleHelp, Eye, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

const map = {
  PASS: { icon: CheckCircle2, cls: "bg-pass-soft text-pass border-pass/30" },
  FAIL: { icon: XCircle, cls: "bg-fail-soft text-fail border-fail/30" },
  UNKNOWN: { icon: CircleHelp, cls: "bg-unknown-soft text-unknown border-unknown/40" },
} as const;

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { icon: Icon, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide", cls, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {status}
    </span>
  );
}

export function ReviewBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border border-review/30 bg-review-soft px-1.5 py-0.5 text-[11px] font-semibold text-review", className)}>
      <Eye className="h-3.5 w-3.5" aria-hidden />
      Needs review
    </span>
  );
}

export function ConfidenceTag({ c }: { c: "high" | "medium" | "low" | null }) {
  if (!c) return <span className="text-muted-foreground">—</span>;
  const bars = c === "high" ? 3 : c === "medium" ? 2 : 1;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", c === "low" ? "text-review" : "text-muted-foreground")}>
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-2.5 w-1 rounded-sm", i < bars ? (c === "low" ? "bg-review" : "bg-foreground/60") : "bg-border")} />
        ))}
      </span>
      {c}
    </span>
  );
}

export const statusRank: Record<Status, number> = { FAIL: 0, UNKNOWN: 1, PASS: 2 };
export const statusColorVar: Record<Status, string> = { PASS: "var(--pass)", FAIL: "var(--fail)", UNKNOWN: "var(--unknown)" };
