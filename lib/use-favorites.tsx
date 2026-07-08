"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const STORAGE_KEY = "favorites";
const EMPTY = new Set<string>();
let snapshot = EMPTY;
let initialized = false;
let activeUserId: string | null = null;
const listeners = new Set<() => void>();
const reconciledUsers = new Set<string>();

function parseFavorites(value: string | null): Set<string> {
  if (!value) return new Set();
  try {
    const parsed: unknown = JSON.parse(value);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  snapshot = parseFavorites(localStorage.getItem(STORAGE_KEY));
}

function getSnapshot() {
  initialize();
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(next: Set<string>, persistLocal = activeUserId === null) {
  snapshot = next;
  try {
    if (persistLocal) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // The in-memory store still works when storage is unavailable.
  }
  listeners.forEach((listener) => listener());
}

async function request(method: "POST" | "DELETE", body?: object) {
  const response = await fetch("/api/favorites", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) return;
  if (!response.ok) throw new Error("Favorite sync failed");
}

async function fetchServerFavorites() {
  const response = await fetch("/api/favorites");
  if (!response.ok) throw new Error("Favorite fetch failed");
  const data = (await response.json()) as { favorites?: unknown };
  return new Set(
    Array.isArray(data.favorites)
      ? data.favorites.filter((item): item is string => typeof item === "string")
      : [],
  );
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      activeUserId = null;
      reconciledUsers.clear();
      update(parseFavorites(localStorage.getItem(STORAGE_KEY)), true);
      return;
    }

    const userChanged = activeUserId !== userId;
    activeUserId = userId;
    if (reconciledUsers.has(userId) && !userChanged) return;
    if (userChanged) update(new Set(), false);
    reconciledUsers.add(userId);

    void fetchServerFavorites()
      .then((serverFavorites) => {
        update(serverFavorites, false);
      })
      .catch(() => {
        reconciledUsers.delete(userId);
      });
  }, [isPending, userId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (activeUserId === null && event.key === STORAGE_KEY) {
        update(parseFavorites(event.newValue), true);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refreshFromServer = useCallback(() => {
    if (!userId) return;
    void fetchServerFavorites()
      .then((serverFavorites) => update(serverFavorites, false))
      .catch(() => undefined);
  }, [userId]);

  const isFavorite = useCallback(
    (code: string, bacType: string) => favorites.has(`${code}|${bacType}`),
    [favorites],
  );

  const toggleFavorite = useCallback((code: string, bacType: string) => {
    const key = `${code}|${bacType}`;
    const next = new Set(getSnapshot());
    const adding = !next.has(key);
    if (adding) next.add(key);
    else next.delete(key);
    update(next, !userId);

    toast(adding ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة", {
      icon: <Heart className="size-4 text-brand-pink" fill="currentColor" />,
      duration: 2000,
    });

    if (!userId) return;
    void request(adding ? "POST" : "DELETE", { code, bacType }).catch(() => {
      refreshFromServer();
    });
  }, [refreshFromServer, userId]);

  const clearFavorites = useCallback(() => {
    update(new Set(), !userId);
    toast("تم حذف جميع المفضلة", {
      icon: <Heart className="size-4 text-brand-pink" fill="currentColor" />,
      duration: 2000,
    });
    if (!userId) return;
    void request("DELETE").catch(() => {
      refreshFromServer();
    });
  }, [refreshFromServer, userId]);

  return { favorites, isFavorite, toggleFavorite, clearFavorites };
}
