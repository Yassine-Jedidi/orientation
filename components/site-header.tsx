"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Menu, Pencil } from "lucide-react";
import Avatar, { genConfig } from "react-nice-avatar";
import { AuthNav } from "@/components/auth/auth-nav";
import { GovernorateEditDialog } from "@/components/profile/governorate-onboarding";
import { Button } from "@/components/ui/button";
import type { Governorate } from "@/lib/governorates";
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
  const { data: session } = authClient.useSession();
  const [governorate, setGovernorate] = useState<Governorate | null>(null);
  const [editGovernorateOpen, setEditGovernorateOpen] = useState(false);
  const links = destinations.filter((destination) => destination.id !== current);

  useEffect(() => {
    if (!session?.user) return;
    const controller = new AbortController();
    fetch("/api/student-score", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((profile: { governorate?: Governorate | null } | null) => {
        if (profile?.governorate) setGovernorate(profile.governorate);
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
            {session?.user?.name && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" className="h-11 px-2" />}
                >
                  <Avatar
                    className="size-9 shrink-0"
                    {...genConfig(session.user.email ?? session.user.name)}
                  />
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
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditGovernorateOpen(true)}>
                    <Pencil /> تغيير الولاية
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-1 py-1"><AuthNav /></div>
                </DropdownMenuContent>
              </DropdownMenu>
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
            {!session && <AuthNav />}
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
                        <Avatar
                          className="size-10 shrink-0"
                          {...genConfig(session.user.email ?? session.user.name)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate">{session.user.name}</span>
                          {governorate && (
                            <span className="mt-0.5 block text-xs text-muted-text">
                              ولاية {governorate}
                            </span>
                          )}
                        </span>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setEditGovernorateOpen(true)}>
                      <Pencil /> تغيير الولاية
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
    <GovernorateEditDialog
      key={governorate ?? "unset"}
      open={editGovernorateOpen}
      onOpenChange={setEditGovernorateOpen}
      currentGovernorate={governorate}
    />
    </>
  );
}
