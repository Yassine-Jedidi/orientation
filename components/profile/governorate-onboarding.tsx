"use client";

import { useEffect, useState } from "react";
import { MapPin, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { TUNISIA_GOVERNORATES, type Governorate } from "@/lib/governorates";
import { GENDERS, GENDER_LABELS, type Gender } from "@/lib/gender";
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

type ProfileFields = {
  governorate: Governorate | null;
  gender: Gender | null;
};

function GenderSelect({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value: Gender | null;
  onValueChange: (value: Gender) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-ink" htmlFor={id}>الجنس</label>
      <Select value={value} onValueChange={(next) => onValueChange(next as Gender)} items={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))}>
        <SelectTrigger id={id} className="w-full"><SelectValue placeholder="اختار الجنس" /></SelectTrigger>
        <SelectContent>
          {GENDERS.map((item) => <SelectItem key={item} value={item}>{GENDER_LABELS[item]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function GovernorateSelect({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value: Governorate | null;
  onValueChange: (value: Governorate) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-ink" htmlFor={id}>الولاية</label>
      <Select value={value} onValueChange={(next) => onValueChange(next as Governorate)} items={TUNISIA_GOVERNORATES.map((g) => ({ value: g, label: g }))}>
        <SelectTrigger id={id} className="w-full"><SelectValue placeholder="اختار ولايتك" /></SelectTrigger>
        <SelectContent listClassName="max-h-72" showScrollbar>
          {TUNISIA_GOVERNORATES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  currentProfile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: ProfileFields;
}) {
  const [governorate, setGovernorate] = useState(currentProfile.governorate);
  const [gender, setGender] = useState(currentProfile.gender);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    if (!governorate || !gender) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/student-score", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorate, gender }),
      });
      if (!response.ok) throw new Error("save");
      onOpenChange(false);
      window.location.reload();
    } catch {
      setError("ما نجّمنّاش نبدّل بياناتك. عاود جرّب.");
      setSaving(false);
    }
  }

  const unchanged = governorate === currentProfile.governorate && gender === currentProfile.gender;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-xl bg-canvas p-0 sm:max-w-md">
        <div className="flex justify-center bg-brand-lavender/45 px-6 pt-7 pb-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-lavender text-ink ring-4 ring-canvas">
            <UserRound className="size-7" aria-hidden="true" />
          </div>
        </div>
        <DialogHeader className="px-6 pt-5 text-center sm:text-center">
          <DialogTitle className="text-title-md">تعديل بياناتي</DialogTitle>
          <DialogDescription className="text-body-sm leading-6">حدّث ولايتك أو جنسك باش تبقى النتائج مناسبة ليك.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <GovernorateSelect id="profile-governorate" value={governorate} onValueChange={setGovernorate} />
          <GenderSelect id="profile-gender" value={gender} onValueChange={setGender} />
          <p className="rounded-lg bg-brand-mint/45 px-4 py-3 text-xs leading-5 text-body">نستعمل البيانات هاذي للتنفيل الجغرافي ولإظهار الشعب المتاحة ليك.</p>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
        </div>
        <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4">
          <Button className="w-full" disabled={!governorate || !gender || unchanged || saving} onClick={saveProfile}>
            {saving ? "جاري الحفظ..." : "حفظ التغيير"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GovernorateOnboarding() {
  const { data: session, isPending } = authClient.useSession();
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<ProfileFields>({ governorate: null, gender: null });
  const [governorate, setGovernorate] = useState<Governorate | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || !session?.user) return;
    const controller = new AbortController();
    fetch("/api/student-score", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("profile");
        return response.json() as Promise<ProfileFields>;
      })
      .then((result) => {
        setProfile(result);
        setGovernorate(result.governorate);
        setGender(result.gender);
        setLoaded(true);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setLoaded(false);
      });
    return () => controller.abort();
  }, [isPending, session?.user]);

  const missingGovernorate = loaded && !profile.governorate;
  const missingGender = loaded && !profile.gender;
  const open = Boolean(session?.user && (missingGovernorate || missingGender));

  async function completeProfile() {
    if ((missingGovernorate && !governorate) || (missingGender && !gender)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/student-score", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(missingGovernorate ? { governorate } : {}),
          ...(missingGender ? { gender } : {}),
        }),
      });
      if (!response.ok) throw new Error("save");
      window.location.reload();
    } catch {
      setError("ما نجّمنّاش نسجّل بياناتك. عاود جرّب.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden rounded-xl bg-canvas p-0 sm:max-w-md">
        <div className="flex justify-center bg-brand-ochre/35 px-6 pt-7 pb-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-ochre text-ink ring-4 ring-canvas">
            {missingGovernorate && !missingGender ? <MapPin className="size-7" /> : <UserRound className="size-7" />}
          </div>
        </div>
        <DialogHeader className="px-6 pt-5 text-center sm:text-center">
          <DialogTitle className="text-title-md">كمّل بياناتك</DialogTitle>
          <DialogDescription className="text-body-sm leading-6">باش نوريولك التنفيل والشعب المناسبة ليك بدقّة.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          {missingGovernorate && <GovernorateSelect id="onboarding-governorate" value={governorate} onValueChange={setGovernorate} />}
          {missingGender && <GenderSelect id="onboarding-gender" value={gender} onValueChange={setGender} />}
          <p className="rounded-lg bg-brand-mint/45 px-4 py-3 text-xs leading-5 text-body">بياناتك نستعملوهم باش نحسبولك التنفيل ونطلعولك الشعب المناسبة ليك.</p>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
        </div>
        <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4">
          <Button className="w-full" disabled={(missingGovernorate && !governorate) || (missingGender && !gender) || saving} onClick={completeProfile}>
            {saving ? "جاري الحفظ..." : "حفظ ومتابعة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
