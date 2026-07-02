"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function AuthNav() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="h-11 w-24 animate-pulse rounded-md bg-surface-strong" />;
  }

  if (!session) {
    return (
      <Button nativeButton={false} render={<Link href="/connexion" />}>
        تسجيل الدخول
      </Button>
    );
  }

  return (
    <Button
      variant="destructive"
      onClick={async () => {
        await authClient.signOut();
        router.refresh();
      }}
    >
      تسجيل الخروج
    </Button>
  );
}
