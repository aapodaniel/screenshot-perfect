import type { Result, Status } from "./api";

export const statusLabel: Record<Status, string> = { PASS: "OK", FAIL: "Violation", UNKNOWN: "Cannot check" };

export function findingTitle(r: Result): string {
  if (r.status === "UNKNOWN") return `${r.check_name.replace(/Clear /i, "")} ${r.evidence.length > 1 ? "has conflicting sources" : "unknown"}`;
  if (r.status === "PASS") return `${r.check_name} meets the rule`;
  const titles: Record<string, string> = {
    clear_width_mm: "Door too narrow", sill_height_mm: "Door sill too high",
    headroom_mm: "Cabin ceiling too low", floor_area_m2: "Cabin floor area too small",
    turning_diameter_mm: "Turning space too small", handle_height_mm: "Door handle too high",
  };
  return titles[r.required_inputs[0] ?? ""] ?? `${r.check_name} outside the limit`;
}

export function findingNumber(r: Result): string {
  if (r.status === "UNKNOWN") return r.evidence.length > 1 ? "Sources disagree — confirm the measurement" : "Measurement missing from drawing";
  return `${r.measured} ${r.unit} · ${r.status === "FAIL" ? "needs" : "required"} ${r.required} ${r.unit}`;
}

export function revisionChange(result: Result, previous: Result[]): "New" | "Fixed" | "Unchanged" {
  const old = previous.find((r) => r.id === result.id);
  if (result.status === "FAIL" && old?.status !== "FAIL") return "New";
  if (result.status !== "FAIL" && old?.status === "FAIL") return "Fixed";
  return "Unchanged";
}