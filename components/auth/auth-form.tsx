"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { TUNISIA_GOVERNORATES } from "@/lib/governorates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AuthFormProps = { mode: "sign-in" | "sign-up" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [error, setError] = useState("");
  const [governorate, setGovernorate] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const result = isSignUp
      ? await authClient.signUp.email({
          name: String(formData.get("name") ?? "").trim(),
          email,
          password,
          governorate,
        })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(
        isSignUp
          ? "تعذّر إنشاء الحساب. تأكد من البيانات أو جرّب بريداً آخر."
          : "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      );
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending || googlePending}
        onClick={async () => {
          setGooglePending(true);
          setError("");
          const result = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/",
            errorCallbackURL: "/connexion",
          });
          if (result?.error) {
            setError("تعذّر تسجيل الدخول باستخدام Google. حاول مجدداً.");
            setGooglePending(false);
          }
        }}
      >
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {googlePending ? "جارٍ الاتصال بـ Google..." : "المتابعة باستخدام Google"}
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-text">أو بالبريد الإلكتروني</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp && (
        <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            الاسم
          </label>
          <Input id="name" name="name" autoComplete="name" required minLength={2} />
        </div>
        <div className="space-y-2">
          <label htmlFor="governorate" className="text-sm font-medium text-ink">
            ولايتك
          </label>
          <Select value={governorate} onValueChange={(value) => setGovernorate(value ?? "")}>
            <SelectTrigger id="governorate" className="w-full" aria-required="true">
              <SelectValue placeholder="اختر ولايتك" />
            </SelectTrigger>
            <SelectContent listClassName="max-h-72" showScrollbar>
              {TUNISIA_GOVERNORATES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-text">
            تُستعمل لاحتساب التنفيل الجغرافي فقط في مؤسسات ولايتك.
          </p>
        </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          البريد الإلكتروني
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          كلمة المرور
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={8}
          required
        />
        {isSignUp && (
          <p className="text-xs text-muted-text">ثمانية أحرف على الأقل</p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending || (isSignUp && !governorate)}>
        {pending
          ? "جارٍ المتابعة..."
          : isSignUp
            ? "إنشاء الحساب"
            : "تسجيل الدخول"}
      </Button>

      <p className="text-center text-sm text-body">
        {isSignUp ? "لديك حساب؟" : "ليس لديك حساب؟"}{" "}
        <Link
          href={isSignUp ? "/connexion" : "/inscription"}
          className="font-semibold text-ink underline underline-offset-4"
        >
          {isSignUp ? "سجّل الدخول" : "أنشئ حساباً"}
        </Link>
      </p>
      </form>
    </div>
  );
}
