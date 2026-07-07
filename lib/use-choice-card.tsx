"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import type { ChoiceCardEntry } from "@/lib/types";
import { encodeShareData } from "@/lib/share-encoding";

const STORAGE_KEY = "choiceCard";
const EMPTY: ChoiceCardEntry[] = [];
let snapshot = EMPTY;
let initialized = false;
const listeners = new Set<() => void>();
const reconciledUsers = new Set<string>();

function parseChoices(value: string | null): ChoiceCardEntry[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? normalizeChoices(
          parsed.filter(
            (item): item is ChoiceCardEntry =>
              typeof item === "object" &&
              item !== null &&
              typeof (item as ChoiceCardEntry).code === "string" &&
              typeof (item as ChoiceCardEntry).bacType === "string" &&
              typeof (item as ChoiceCardEntry).rank === "number",
          ).sort((a, b) => a.rank - b.rank),
        )
      : [];
  } catch {
    return [];
  }
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  snapshot = parseChoices(localStorage.getItem(STORAGE_KEY));
}

function getSnapshot() {
  initialize();
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(next: ChoiceCardEntry[]) {
  snapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // In-memory store still works
  }
  listeners.forEach((listener) => listener());
}

function getNextRank(): number {
  const entries = getSnapshot();
  for (let i = 1; i <= 10; i++) {
    if (!entries.some((e) => e.rank === i)) return i;
  }
  return 11; // full
}

function normalizeChoices(entries: ChoiceCardEntry[]): ChoiceCardEntry[] {
  return entries
    .filter(
      (entry, index, array) =>
        array.findIndex(
          (item) => item.code === entry.code && item.bacType === entry.bacType,
        ) === index,
    )
    .slice(0, 10)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function choicesEqual(a: ChoiceCardEntry[], b: ChoiceCardEntry[]) {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        entry.code === b[index]?.code &&
        entry.bacType === b[index]?.bacType &&
        entry.rank === b[index]?.rank,
    )
  );
}

async function request(method: "POST" | "DELETE" | "PUT", body?: object) {
  const response = await fetch("/api/choice-card", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) return;
  if (!response.ok) throw new Error("Choice card sync failed");
  return response.json() as Promise<{ choices?: ChoiceCardEntry[] }>;
}

export function useChoiceCard() {
  const choices = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (isPending || !userId || reconciledUsers.has(userId)) return;
    reconciledUsers.add(userId);

    void fetch("/api/choice-card")
      .then(async (response) => {
        if (!response.ok) throw new Error("Choice card fetch failed");
        const data = (await response.json()) as { choices?: ChoiceCardEntry[] };
        if (Array.isArray(data.choices)) {
          const local = getSnapshot();
          const merged = normalizeChoices([...data.choices, ...local]);
          update(merged);

          if (!choicesEqual(merged, data.choices)) {
            void request("PUT", { choices: merged }).catch(() => {
              reconciledUsers.delete(userId);
            });
          }
        }
      })
      .catch(() => {
        reconciledUsers.delete(userId);
      });
  }, [isPending, userId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) update(parseChoices(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getEntry = useCallback(
    (code: string, bacType: string) =>
      choices.find((e) => e.code === code && e.bacType === bacType) ?? null,
    [choices],
  );

  const isInCard = useCallback(
    (code: string, bacType: string) => choices.some((e) => e.code === code && e.bacType === bacType),
    [choices],
  );

  const addChoice = useCallback((code: string, bacType: string) => {
    const entries = getSnapshot();
    if (entries.some((e) => e.code === code && e.bacType === bacType)) {
      toast("هذا البرنامج موجود بالفعل في البطاقة", { duration: 2000 });
      return;
    }
    const rank = getNextRank();
    if (rank > 10) {
      toast("يمكنك إضافة 10 اختيارات كحد أقصى", { duration: 2000 });
      return;
    }
    const next = [...entries, { code, bacType, rank }];
    update(next);

    toast("تمت الإضافة إلى بطاقة الاختيارات", { duration: 2000 });

    void request("POST", { code, bacType }).catch(() => undefined);
  }, []);

  const removeChoice = useCallback((code: string, bacType: string) => {
    const entries = getSnapshot();
    const filtered = entries.filter((e) => !(e.code === code && e.bacType === bacType));
    const reindexed = filtered.map((e, i) => ({ ...e, rank: i + 1 }));
    update(reindexed);

    toast("تمت الإزالة من بطاقة الاختيارات", { duration: 2000 });

    void request("DELETE", { code, bacType }).catch(() => undefined);
  }, []);

  const reorder = useCallback((entries: ChoiceCardEntry[]) => {
    const reindexed = entries.map((e, i) => ({ ...e, rank: i + 1 }));
    update(reindexed);

    void request("PUT", { choices: reindexed }).catch(() => undefined);
  }, []);

  const clearAll = useCallback(() => {
    update([]);
    toast("تم تفريغ بطاقة الاختيارات", { duration: 2000 });
    void request("DELETE").catch(() => undefined);
  }, []);

  const getShareLink = useCallback(() => {
    const entries = getSnapshot();
    if (entries.length === 0) {
      toast("أضف اختياراتك أولاً قبل المشاركة", { duration: 2000 });
      return "";
    }
    const bacType = entries[0].bacType;
    const codes = entries.map((e) => e.code);
    const id = encodeShareData(bacType, codes);
    const url = `${window.location.origin}/bitaka/view/${id}`;
    return url;
  }, []);

  const copyShareLink = useCallback(() => {
    const url = getShareLink();
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => toast("تم نسخ رابط البطاقة", { duration: 2000 }),
      () => toast("تعذر نسخ الرابط", { duration: 2000 }),
    );
  }, [getShareLink]);

  return {
    choices,
    getEntry,
    isInCard,
    addChoice,
    removeChoice,
    reorder,
    clearAll,
    getShareLink,
    copyShareLink,
  };
}
