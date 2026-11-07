import { useSyncExternalStore } from "react";

export interface Settings { apiUrl: string; demo: boolean; theme: "light" | "dark" }
const KEY = "provenai.settings";
export const DEFAULT_SETTINGS: Settings = { apiUrl: "http://localhost:8000", demo: true, theme: "light" };
let cache: Settings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  if (!cache) {
    try { cache = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || "{}"), theme: "light" }; } catch { cache = DEFAULT_SETTINGS; }
  }
  return cache ?? DEFAULT_SETTINGS;
}
export function setSettings(patch: Partial<Settings>) {
  cache = { ...getSettings(), ...patch, theme: "light" };
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useSettings = () => useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
