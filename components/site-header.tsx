"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Menu, Pencil, UserRound } from "lucide-react";
import Avatar from "react-nice-avatar";
import { AuthNav } from "@/components/auth/auth-nav";
import { ProfileEditDialog } from "@/components/profile/governorate-onboarding";
import { Button } from "@/components/ui/button";
import type { Governorate } from "@/lib/governorates";
import { GENDER_LABELS, type Gender } from "@/lib/gender";
import { getGenderedAvatarConfig } from "@/lib/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

type PageId = "guide" | "calculator" | "tenfil";

const destinations = [
  { id: "guide", href: "/", label: "دليل التوجيه" },
  { id: "calculator", href: "/calculatrice", label: "احسب سكورك" },
  { id: "tenfil", href: "/tenfil", label: "التنفيل الجغرافي" },
] as const;

export function SiteHeader({
  current,
  title,
  subtitle,
}: {
  current: PageId;
  title: string;
  subtitle: string;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [hasSessionCookie, setHasSessionCookie] = useState(false);
  const [governorate, setGovernorate] = useState<Governorate | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const links = destinations.filter((destination) => destination.id !== current);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setHasSessionCookie(document.cookie.includes("better-auth.session_token") || document.cookie.includes("session"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const controller = new AbortController();
    fetch("/api/student-score", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((profile: { governorate?: Governorate | null; gender?: Gender | null } | null) => {
        if (profile?.governorate) setGovernorate(profile.governorate);
        if (profile?.gender) setGender(profile.gender);
        setProfileLoaded(Boolean(profile));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [session?.user]);

  return (
    <>
    <header className="border-b border-border bg-canvas">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm font-heading font-medium text-ink">{title}</h1>
            <p className="mt-2 text-body">{subtitle}</p>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {mounted && (
              isPending ? (
                hasSessionCookie && (
                  <div className="flex h-11 items-center gap-2 px-2 animate-pulse">
                    <div className="size-9 rounded-full bg-surface-strong" />
                    <div className="h-4 w-16 rounded bg-surface-strong" />
                  </div>
                )
              ) : (
                session?.user?.name && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" className="h-11 px-2" />}
                    >
                      {profileLoaded && gender ? (
                        <Avatar className="size-9 shrink-0" {...getGenderedAvatarConfig(session.user.email ?? session.user.name, gender)} />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-strong"><UserRound className="size-5" /></span>
                      )}
                      <span className="max-w-32 truncate text-sm text-body">
                        {session.user.name}
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" sideOffset={8} className="w-56">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>
                          <span className="block truncate">{session.user.name}</span>
                          {governorate && (
                            <span className="mt-1 flex items-center gap-1.5 text-xs font-normal text-muted-text">
                              <MapPin className="size-3.5" /> ولاية {governorate}
                            </span>
                          )}
                          {gender && <span className="mt-1 block text-xs font-normal text-muted-text">الجنس: {GENDER_LABELS[gender]}</span>}
                        </DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEditProfileOpen(true)}>
                        <Pencil /> تعديل بياناتي
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-1 py-1"><AuthNav /></div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              )
            )}

            {links.map((link) => (
              <Button
                key={link.id}
                nativeButton={false}
                variant={link.id === "calculator" ? "brand-mint" : link.id === "tenfil" ? "brand-lavender" : "brand-peach"}
                render={<Link href={link.href} />}
              >
                {link.label}
              </Button>
            ))}

            {mounted && (
              isPending ? (
                !hasSessionCookie && (
                  <div className="h-11 w-24 animate-pulse rounded-md bg-surface-strong" />
                )
              ) : (
                !session && <AuthNav />
              )
            )}
          </div>

          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                <Menu className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-52">
                {session?.user?.name && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                        {profileLoaded && gender ? (
                          <Avatar className="size-10 shrink-0" {...getGenderedAvatarConfig(session.user.email ?? session.user.name, gender)} />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-strong"><UserRound className="size-5" /></span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate">{session.user.name}</span>
                          {governorate && (
                            <span className="mt-0.5 block text-xs text-muted-text">
                              ولاية {governorate}
                            </span>
                          )}
                          {gender && <span className="mt-0.5 block text-xs text-muted-text">الجنس: {GENDER_LABELS[gender]}</span>}
                        </span>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setEditProfileOpen(true)}>
                      <Pencil /> تعديل بياناتي
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {links.map((link) => (
                  <DropdownMenuItem key={link.id}>
                    <Link href={link.href} className="flex w-full items-center gap-2">
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="px-1 py-1">
                  <AuthNav />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
    <ProfileEditDialog
      key={`${governorate ?? "unset"}-${gender ?? "unset"}`}
      open={editProfileOpen}
      onOpenChange={setEditProfileOpen}
      currentProfile={{ governorate, gender }}
    />
    </>
  );
}
