"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = { mode: "sign-in" | "sign-up" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp && (
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            الاسم
          </label>
          <Input id="name" name="name" autoComplete="name" required minLength={2} />
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

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "جارٍ المتابعة..."
          : isSignUp
            ? "إنشاء الحساب"
            : "تسجيل الدخول"}
      </Button>

      <p className="text-center text-sm text-body">
        {isSignUp ? "لديك حساب؟" : "ليس لديك حساب؟"}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-ink underline underline-offset-4"
        >
          {isSignUp ? "سجّل الدخول" : "أنشئ حساباً"}
        </Link>
      </p>
    </form>
  );
}
