"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ClipboardList, Trash2, UserRound } from "lucide-react";
import type { ScoreRecord } from "@/lib/types";
import { useChoiceCard } from "@/lib/use-choice-card";
import { useFavorites } from "@/lib/use-favorites";
import { authClient } from "@/lib/auth-client";
import { getLocalScore } from "@/lib/local-score";
import { isGender, type Gender } from "@/lib/gender";
import { isGeographicBonusApplicableForRecord } from "@/lib/geographic-bonus";
import {
  getBaseScore,
  getRowStatus,
} from "@/lib/choice-eligibility";
import { Button } from "@/components/ui/button";
import { ChoiceCardItem } from "@/components/choice-card-item";
import { ChoiceCardAddDialog } from "@/components/choice-card-add-dialog";
import { ChoiceCardShare } from "@/components/choice-card-share";
import { Card, CardContent } from "@/components/ui/card";

const EMPTY_RECORDS: ScoreRecord[] = [];

function getRecordByKey(
  records: ScoreRecord[],
  code: string,
  bacType: string,
): ScoreRecord | undefined {
  return records.find((r) => r.code === code && r.bacType === bacType);
}

function SortableChoiceCard({
  entry,
  record,
  userScore,
  userBacType,
  userGrades,
  userGovernorate,
  userGender,
  records,
  isFavorite,
  onToggleFavorite,
  onRemove,
}: {
  entry: { code: string; bacType: string; rank: number };
  record: ScoreRecord;
  userScore: number | null;
  userBacType: string | null;
  userGrades: Record<string, number> | null;
  userGovernorate: string | null;
  userGender: Gender | null;
  records: ScoreRecord[];
  isFavorite: boolean;
  onToggleFavorite: (code: string, bacType: string) => void;
  onRemove: (code: string, bacType: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${entry.code}|${entry.bacType}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const status = getRowStatus({
    record,
    userScore,
    userBacType,
    userGrades,
    userGovernorate,
    userGender,
    records,
    useGeographicBonus: true,
  });

  const geoBonusApplicable = isGeographicBonusApplicableForRecord(
    record,
    userGovernorate,
    records,
    true,
  );

  const effective =
    getBaseScore(record.formula, userScore, userGrades);

  return (
    <div ref={setNodeRef} style={style}>
      <ChoiceCardItem
        entry={entry}
        record={record}
        status={status}
        effective={effective}
        userBacType={userBacType}
        userGovernorate={userGovernorate}
        userScore={userScore}
        userGrades={userGrades}
        geoBonusApplicable={geoBonusApplicable}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

export function BittakaClient() {
  const {
    choices,
    isInCard,
    addChoice,
    removeChoice,
    reorder,
    clearAll,
    repairChoices,
    getShareLink,
    copyShareLink,
    isLoaded: choiceCardLoaded,
  } = useChoiceCard();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { data: session, isPending } = authClient.useSession();

  // User score state
  const [userBacType, setUserBacType] = useState<string | null>(null);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [userGrades, setUserGrades] = useState<Record<string, number> | null>(null);
  const [userGender, setUserGender] = useState<Gender | null>(null);
  const [userGovernorate, setUserGovernorate] = useState<string | null>(null);
  const [userStateLoaded, setUserStateLoaded] = useState(false);
  const [records, setRecords] = useState<ScoreRecord[] | null>(null);
  const [recordsRequested, setRecordsRequested] = useState(false);

  useEffect(() => {
    if (isPending || userStateLoaded) return;

    if (!session) {
      void Promise.resolve().then(() => {
        const local = getLocalScore();
        if (local) {
          setUserBacType(local.bacType);
          setUserScore(local.fg);
          setUserGovernorate(local.governorate);
          const grades: Record<string, number> = {};
          for (const [k, v] of Object.entries(local.grades)) {
            grades[k] = Number(v);
          }
          setUserGrades(grades);
        }
        setUserStateLoaded(true);
      });
      return;
    }

    void fetch("/api/student-score")
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (!payload) return;
        if (payload.bacType) setUserBacType(payload.bacType);
        if (payload.gender && isGender(payload.gender)) setUserGender(payload.gender);
        if (payload.governorate) setUserGovernorate(payload.governorate);
        if (payload.score?.fg != null) {
          setUserScore(Number(payload.score.fg));
          if (payload.score.grades) {
            setUserGrades(
              Object.fromEntries(
                Object.entries(payload.score.grades).map(([k, v]) => [k, Number(v)]),
              ),
            );
            return;
          }
        }
        const local = getLocalScore();
        if (local) {
          setUserBacType(local.bacType);
          setUserScore(local.fg);
          setUserGovernorate(local.governorate);
          const grades: Record<string, number> = {};
          for (const [k, v] of Object.entries(local.grades)) {
            grades[k] = Number(v);
          }
          setUserGrades(grades);
        }
      })
      .catch(() => undefined)
      .finally(() => setUserStateLoaded(true));
  }, [isPending, session, userStateLoaded]);

  const shouldLoadRecords = recordsRequested || (choiceCardLoaded && choices.length > 0);

  useEffect(() => {
    if (!shouldLoadRecords || records) return;

    let ignore = false;
    void fetch("/data/scores.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((payload: unknown) => {
        if (!ignore) setRecords(Array.isArray(payload) ? (payload as ScoreRecord[]) : []);
      })
      .catch(() => {
        if (!ignore) setRecords([]);
      });

    return () => {
      ignore = true;
    };
  }, [records, shouldLoadRecords]);

  useEffect(() => {
    if (!records || choices.length === 0) return;
    repairChoices(
      new Set(records.map((record) => `${record.code}|${record.bacType}`)),
    );
  }, [choices, records, repairChoices]);

  // Build record lookup for choice entries
  const choiceRecords = useMemo(() => {
    const scoreRecords = records ?? EMPTY_RECORDS;
    return choices
      .map((entry) => ({
        entry,
        record: getRecordByKey(scoreRecords, entry.code, entry.bacType),
      }))
      .filter((item): item is { entry: typeof item.entry; record: ScoreRecord } => item.record !== undefined)
      .sort((a, b) => a.entry.rank - b.entry.rank);
  }, [choices, records]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const items = choices.map((e) => ({ ...e }));
      const oldIndex = items.findIndex(
        (e) => `${e.code}|${e.bacType}` === active.id,
      );
      const newIndex = items.findIndex(
        (e) => `${e.code}|${e.bacType}` === over.id,
      );
      if (oldIndex === -1 || newIndex === -1) return;

      const [moved] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, moved);
      reorder(items);
    },
    [choices, reorder],
  );

  const hasScore = userScore !== null;

  const showFull = hasScore && choices.length > 0;

  const scoreRecords = records ?? EMPTY_RECORDS;
  const loadingChoiceRecords = choices.length > 0 && !records;

  if (isPending || !userStateLoaded || !choiceCardLoaded || loadingChoiceRecords) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        {/* Actions skeleton */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="h-9 w-24 animate-pulse rounded-full bg-surface-strong" />
          <div className="h-9 w-32 animate-pulse rounded-full bg-surface-strong" />
          <div className="h-9 w-20 animate-pulse rounded-full bg-surface-strong" />
        </div>
        {/* Choice cards skeleton */}
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border bg-surface-card px-4 py-3"
            >
              {/* Rank */}
              <div className="size-8 animate-pulse rounded-full bg-surface-strong" />
              {/* Drag handle */}
              <div className="size-4 animate-pulse rounded bg-surface-strong" />
              {/* Info */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-3/5 animate-pulse rounded bg-surface-strong" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-surface-strong" />
              </div>
              {/* Score */}
              <div className="flex flex-col items-end gap-1">
                <div className="h-4 w-16 animate-pulse rounded bg-surface-strong" />
                <div className="h-3 w-12 animate-pulse rounded bg-surface-strong" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full px-6 py-8 ${showFull ? "max-w-4xl" : "max-w-2xl"}`}>
      {/* Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
          <ChoiceCardAddDialog
            records={scoreRecords}
            isLoadingRecords={shouldLoadRecords && !records}
            onOpen={() => setRecordsRequested(true)}
            userBacType={userBacType}
            userGender={userGender}
            userGovernorate={userGovernorate}
            userGrades={userGrades}
            isInCard={isInCard}
            onAdd={addChoice}
            choiceCount={choices.length}
          />
          <ChoiceCardShare
            onGetLink={getShareLink}
            onCopyLink={copyShareLink}
            hasChoices={choices.length > 0}
          />
          <Button
            variant="outline"
            onClick={clearAll}
            disabled={choices.length === 0}
          >
            <Trash2 className="size-4" /> تفريغ
          </Button>
        </div>

      {/* No bac type prompt */}
      {!hasScore && (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <UserRound className="size-12 text-muted-soft" />
            <p className="text-body text-muted-text">
              يجب إدخال سكورك أولاً لمعرفة أهليتك للبرامج
            </p>
            <Button
              variant="default"
              nativeButton={false}
              render={<Link href="/calculatrice" />}
            >
              احسب سكورك
            </Button>
          </CardContent>
        </Card>
      )}

      {hasScore && choices.length === 0 ? (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <ClipboardList className="size-12 text-muted-soft" />
            <p className="text-body text-muted-text">
              لا توجد اختيارات بعد
            </p>
          </CardContent>
        </Card>
      ) : hasScore ? (
        <>
          {/* Sortable list */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={choiceRecords.map((cr) => `${cr.entry.code}|${cr.entry.bacType}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {choiceRecords.map(({ entry, record }) => (
                  <SortableChoiceCard
                    key={`${entry.code}|${entry.bacType}`}
                    entry={entry}
                    record={record}
                    userScore={userScore}
                    userBacType={userBacType}
                    userGrades={userGrades}
                    userGovernorate={userGovernorate}
                    userGender={userGender}
                    records={scoreRecords}
                    isFavorite={isFavorite(record.code, record.bacType)}
                    onToggleFavorite={toggleFavorite}
                    onRemove={removeChoice}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Empty slots */}
          {choices.length > 0 && choices.length < 10 && (
            <div className="mt-4">
              <p className="text-xs text-muted-text">
                {10 - choices.length} {10 - choices.length === 1 ? "اختيار" : "اختيارات"} متبقية
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
