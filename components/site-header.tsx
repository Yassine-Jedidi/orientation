"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import Avatar, { genConfig } from "react-nice-avatar";
import { AuthNav } from "@/components/auth/auth-nav";
import { Button } from "@/components/ui/button";
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
  const links = destinations.filter((destination) => destination.id !== current);

  return (
    <header className="border-b border-border bg-canvas">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm font-heading font-medium text-ink">{title}</h1>
            <p className="mt-2 text-body">{subtitle}</p>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {session?.user?.name && (
              <span className="flex items-center gap-2">
                <Avatar
                  className="size-10 shrink-0"
                  {...genConfig(session.user.email ?? session.user.name)}
                />
                <span className="text-sm text-body">{session.user.name}</span>
              </span>
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
            <AuthNav />
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
                        <span>{session.user.name}</span>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
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
  );
}
