"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "launchpad.avatars";
const CHANGE_EVENT = "launchpad-avatars-change";

function readMap(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Get the stored avatar (data URI) for a token address, if any. */
export function getTokenAvatar(address: string): string | null {
  if (typeof window === "undefined") return null;
  return readMap()[address.toLowerCase()] ?? null;
}

/** Persist an avatar (data URI) for a token address. */
export function setTokenAvatar(address: string, dataUri: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = readMap();
    map[address.toLowerCase()] = dataUri;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage quota exceeded — ignore, avatar simply won't persist
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // ignore
  }
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

/** Reactive avatar lookup for a token address. */
export function useTokenAvatar(address: string): string | null {
  const key = address.toLowerCase();
  return useSyncExternalStore(
    subscribe,
    () => getTokenAvatar(key),
    () => null,
  );
}