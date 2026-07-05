"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const STORAGE_KEY = "favorites";
const EMPTY = new Set<string>();
let snapshot = EMPTY;
let initialized = false;
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

function update(next: Set<string>) {
  snapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
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

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (isPending || !userId || reconciledUsers.has(userId)) return;
    reconciledUsers.add(userId);

    void fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorites: [...getSnapshot()] }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Favorite reconciliation failed");
        const data = (await response.json()) as { favorites?: unknown };
        if (Array.isArray(data.favorites)) {
          const merged = new Set(getSnapshot());
          data.favorites
            .filter((item): item is string => typeof item === "string")
            .forEach((item) => merged.add(item));
          update(merged);
        }
      })
      .catch(() => {
        reconciledUsers.delete(userId);
      });
  }, [isPending, userId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) update(parseFavorites(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
    update(next);

    toast(adding ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة", {
      icon: <Heart className="size-4 text-brand-pink" fill="currentColor" />,
      duration: 2000,
    });

    void request(adding ? "POST" : "DELETE", { code, bacType }).catch(() => {
      toast("تعذرت المزامنة مع الخادم", {
        description: "تم حفظ التغيير محليًا وسنحاول مزامنته لاحقًا",
        duration: 3000,
      });
    });
  }, []);

  const clearFavorites = useCallback(() => {
    update(new Set());
    toast("تم حذف جميع المفضلة", {
      icon: <Heart className="size-4 text-brand-pink" fill="currentColor" />,
      duration: 2000,
    });
    void request("DELETE").catch(() => {
      toast("تعذرت المزامنة مع الخادم", { duration: 3000 });
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite, clearFavorites };
}
