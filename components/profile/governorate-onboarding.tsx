"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { TUNISIA_GOVERNORATES, type Governorate } from "@/lib/governorates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GovernorateEditDialog({
  open,
  onOpenChange,
  currentGovernorate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGovernorate: Governorate | null;
}) {
  const [governorate, setGovernorate] = useState<Governorate | null>(
    currentGovernorate,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveGovernorate() {
    if (!governorate) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/student-score", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorate }),
      });
      if (!response.ok) throw new Error("save");
      onOpenChange(false);
      window.location.reload();
    } catch {
      setError("ما نجّمنّاش نبدّل الولاية. عاود جرّب.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-xl bg-canvas p-0 sm:max-w-md">
        <div className="flex justify-center bg-brand-lavender/45 px-6 pt-7 pb-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-lavender text-ink ring-4 ring-canvas">
            <MapPin className="size-7" aria-hidden="true" />
          </div>
        </div>
        <DialogHeader className="px-6 pt-5 text-center sm:text-center">
          <DialogTitle className="text-title-md">تغيير الولاية</DialogTitle>
          <DialogDescription className="text-body-sm leading-6">
            بدّل ولايتك باش نحدّثولك نتائج التنفيل الجغرافي.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-6 py-5">
          <label className="block text-sm font-semibold text-ink" htmlFor="governorate-edit">
            الولاية
          </label>
          <Select
            value={governorate}
            onValueChange={(value) => setGovernorate(value as Governorate)}
          >
            <SelectTrigger id="governorate-edit" className="w-full">
              <SelectValue placeholder="اختر ولايتك" />
            </SelectTrigger>
            <SelectContent listClassName="max-h-72" showScrollbar>
              {TUNISIA_GOVERNORATES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="rounded-lg bg-brand-mint/45 px-4 py-3 text-xs leading-5 text-body">
            التغيير يحدّث فلتر المؤسسات والتنـفيل الجغرافي حسب ولايتك الجديدة.
          </p>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
        </div>
        <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4">
          <Button
            type="button"
            className="w-full"
            disabled={!governorate || governorate === currentGovernorate || saving}
            onClick={saveGovernorate}
          >
            {saving ? "جاري الحفظ..." : "حفظ التغيير"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GovernorateOnboarding() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [needsGovernorate, setNeedsGovernorate] = useState(false);
  const [governorate, setGovernorate] = useState<Governorate | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionPending || !session?.user) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/student-score", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("profile");
        return response.json() as Promise<{ governorate: string | null }>;
      })
      .then((profile) => setNeedsGovernorate(!profile.governorate))
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setNeedsGovernorate(false);
      });

    return () => controller.abort();
  }, [session?.user, sessionPending]);

  async function saveGovernorate() {
    if (!governorate) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/student-score", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorate }),
      });
      if (!response.ok) throw new Error("save");

      setNeedsGovernorate(false);
      window.location.reload();
    } catch {
      setError("ما نجّمنّاش نسجّل الولاية. عاود جرّب.");
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(session?.user && needsGovernorate)}
      onOpenChange={() => undefined}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-xl bg-canvas p-0 sm:max-w-md"
      >
        <div className="flex justify-center bg-brand-ochre/35 px-6 pt-7 pb-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-ochre text-ink ring-4 ring-canvas">
            <MapPin className="size-7" aria-hidden="true" />
          </div>
        </div>

        <DialogHeader className="px-6 pt-5 text-center sm:text-center">
          <DialogTitle className="text-title-md">حدّد ولايتك</DialogTitle>
          <DialogDescription className="text-body-sm leading-6">
            باش نحسبولك التنفيل الجغرافي بدقّة ونوريولك النتائج الخاصة بولايتك.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-5">
          <label className="block text-sm font-semibold text-ink" htmlFor="governorate-onboarding">
            الولاية
          </label>
          <Select
            value={governorate}
            onValueChange={(value) => setGovernorate(value as Governorate)}
          >
            <SelectTrigger id="governorate-onboarding" className="w-full">
              <SelectValue placeholder="اختر ولايتك" />
            </SelectTrigger>
            <SelectContent listClassName="max-h-72" showScrollbar>
              {TUNISIA_GOVERNORATES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="rounded-lg bg-brand-mint/45 px-4 py-3 text-xs leading-5 text-body">
            نعتمد الولاية هاذي فقط لتحديد المؤسسات اللي ينطبق عليها التنفيل الجغرافي.
          </p>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4">
          <Button
            type="button"
            className="w-full"
            disabled={!governorate || saving}
            onClick={saveGovernorate}
          >
            {saving ? "جاري الحفظ..." : "حفظ ومتابعة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
