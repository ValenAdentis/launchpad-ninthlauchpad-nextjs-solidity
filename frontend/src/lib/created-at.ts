"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "launchpad.createdAt";
const CHANGE_EVENT = "launchpad-created-at-change";

function readMap(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Record the created timestamp (ms epoch) for a launch id. */
export function setTokenCreatedAt(id: bigint | number, ms = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    const map = readMap();
    map[String(id)] = ms;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

/** Ensure a timestamp exists for a launch id, recording one on first view. */
export function ensureTokenCreatedAt(id: bigint | number): number | null {
  if (typeof window === "undefined") return null;
  const key = String(id);
  const map = readMap();
  if (map[key] != null) return map[key];
  const ms = Date.now();
  try {
    map[key] = ms;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
  return ms;
}

function subscribe(onChange: () => void) {
  const notify = () => onChange();
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

/** Reactive created timestamp (ms) for a launch id, or null when unknown. */
export function useTokenCreatedAt(id: bigint | number): number | null {
  const key = String(id);
  return useSyncExternalStore(
    subscribe,
    () => readMap()[key] ?? null,
    () => null,
  );
}

let tick = Date.now();
const tickListeners = new Set<() => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

function startTicker() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    tick = Date.now();
    for (const l of tickListeners) l();
  }, 30_000);
}

function subscribeTicker(onChange: () => void) {
  startTicker();
  tickListeners.add(onChange);
  return () => {
    tickListeners.delete(onChange);
    if (tickListeners.size === 0 && tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}

/** Current time, refreshed every 30s so relative labels stay fresh. */
export function useNow(): number {
  return useSyncExternalStore(subscribeTicker, () => tick, () => tick);
}

/** Format a timestamp as a short relative label. */
export function formatTimeAgo(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}