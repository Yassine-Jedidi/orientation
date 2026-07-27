"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import type { ChoiceCardEntry } from "@/lib/types";
import { encodeShareData, encodeUserData, type ShareUserData } from "@/lib/share-encoding";

const STORAGE_KEY = "choiceCard";
const EMPTY: ChoiceCardEntry[] = [];
let snapshot = EMPTY;
let initialized = false;
let activeUserId: string | null = null;
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

function update(next: ChoiceCardEntry[], persistLocal = activeUserId === null) {
  snapshot = next;
  try {
    if (persistLocal) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
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
  if (!response.ok) throw new Error("Choice card sync failed");
  return response.json() as Promise<{ choices?: ChoiceCardEntry[] }>;
}

async function fetchServerChoices() {
  const response = await fetch("/api/choice-card");
  if (!response.ok) throw new Error("Choice card fetch failed");
  const data = (await response.json()) as { choices?: ChoiceCardEntry[] };
  return normalizeChoices(Array.isArray(data.choices) ? data.choices : []);
}

export function useChoiceCard() {
  const choices = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const isLoaded = !isPending && (!userId || reconciledUsers.has(userId));

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      activeUserId = null;
      reconciledUsers.clear();
      update(parseChoices(localStorage.getItem(STORAGE_KEY)), true);
      return;
    }
    const userChanged = activeUserId !== userId;
    activeUserId = userId;
    if (reconciledUsers.has(userId) && !userChanged) return;
    if (userChanged) update(EMPTY, false);
    reconciledUsers.add(userId);

    void fetchServerChoices()
      .then((serverChoices) => {
        update(serverChoices, false);
      })
      .catch(() => {
        reconciledUsers.delete(userId);
      });
  }, [isPending, userId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (activeUserId === null && event.key === STORAGE_KEY) {
        update(parseChoices(event.newValue), true);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refreshFromServer = useCallback(() => {
    if (!userId) return;
    void fetchServerChoices()
      .then((serverChoices) => update(serverChoices, false))
      .catch(() => undefined);
  }, [userId]);

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
    if (entries.length > 0 && entries.some((e) => e.bacType !== bacType)) {
      toast("بطاقة الاختيارات تقبل شعبة باكالوريا واحدة فقط", { duration: 2000 });
      return;
    }
    const rank = getNextRank();
    if (rank > 10) {
      toast("يمكنك إضافة 10 اختيارات كحد أقصى", { duration: 2000 });
      return;
    }
    const next = [...entries, { code, bacType, rank }];
    update(next, !userId);

    const remaining = 10 - next.length;
    toast(`تمت الإضافة — ${remaining === 0 ? "لا اختيارات متبقية" : remaining === 1 ? "اختيار واحد متبقي" : `${remaining} اختيارات متبقية`}`, { duration: 2000 });

    if (!userId) return;
    void request("POST", { code, bacType }).catch(() => {
      refreshFromServer();
    });
  }, [refreshFromServer, userId]);

  const removeChoice = useCallback((code: string, bacType: string) => {
    const entries = getSnapshot();
    const filtered = entries.filter((e) => !(e.code === code && e.bacType === bacType));
    const reindexed = filtered.map((e, i) => ({ ...e, rank: i + 1 }));
    update(reindexed, !userId);

    toast("تمت الإزالة من بطاقة الاختيارات", { duration: 2000 });

    if (!userId) return;
    void request("DELETE", { code, bacType }).catch(() => {
      refreshFromServer();
    });
  }, [refreshFromServer, userId]);

  const reorder = useCallback((entries: ChoiceCardEntry[]) => {
    const reindexed = entries.map((e, i) => ({ ...e, rank: i + 1 }));
    update(reindexed, !userId);

    if (!userId) return;
    void request("PUT", { choices: reindexed }).catch(() => {
      refreshFromServer();
    });
  }, [refreshFromServer, userId]);

  const clearAll = useCallback(() => {
    update([], !userId);
    toast("تم تفريغ بطاقة الاختيارات", { duration: 2000 });
    if (!userId) return;
    void request("DELETE").catch(() => {
      refreshFromServer();
    });
  }, [refreshFromServer, userId]);

  const repairChoices = useCallback((validKeys: Set<string>) => {
    const repaired = normalizeChoices(
      getSnapshot().filter((entry) => validKeys.has(`${entry.code}|${entry.bacType}`)),
    );
    if (choicesEqual(repaired, getSnapshot())) return;

    update(repaired, !userId);
    if (!userId) return;
    void request("PUT", { choices: repaired }).catch(() => {
      refreshFromServer();
    });
  }, [refreshFromServer, userId]);

  const getShareLink = useCallback((userData?: ShareUserData) => {
    const entries = getSnapshot();
    if (entries.length === 0) {
      toast("أضف اختياراتك أولاً قبل المشاركة", { duration: 2000 });
      return "";
    }
    const id = encodeShareData(entries.map((entry) => ({
      bacType: entry.bacType,
      code: entry.code,
    })));
    let url = `${window.location.origin}/bitaka/view/${id}`;
    if (userData) {
      url += `?d=${encodeUserData(userData)}`;
    }
    return url;
  }, []);

  const copyShareLink = useCallback((userData?: ShareUserData) => {
    const url = getShareLink(userData);
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
    repairChoices,
    getShareLink,
    copyShareLink,
    isLoaded,
  };
}
