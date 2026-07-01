"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GeographicBonusLicense } from "./page";

type ListKind = "eligible" | "excluded";

export function GeographicBonusDirectory({
  eligible,
  excluded,
}: {
  eligible: GeographicBonusLicense[];
  excluded: GeographicBonusLicense[];
}) {
  const [active, setActive] = useState<ListKind>("eligible");
  const [query, setQuery] = useState("");
  const source = active === "eligible" ? eligible : excluded;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar");
    if (!normalized) return source;
    return source.filter(
      (license) =>
        license.code.includes(normalized) ||
        license.name.toLocaleLowerCase("ar").includes(normalized),
    );
  }, [query, source]);

  return (
    <Card className="bg-canvas">
      <CardHeader className="gap-5 border-b border-border pb-6">
        <div>
          <CardTitle className="text-title-lg">قائمة الشعب الوطنية</CardTitle>
          <CardDescription className="mt-2">
            ابحث باسم الشعبة أو بالرمز الوطني المكوّن من ثلاثة أرقام.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full gap-2 rounded-lg bg-surface-card p-1 lg:w-auto">
            <Button
              className="flex-1 lg:flex-none"
              variant={active === "eligible" ? "default" : "ghost"}
              onClick={() => setActive("eligible")}
            >
              <Check className="size-4" />
              مشمولة ({eligible.length})
            </Button>
            <Button
              className="flex-1 lg:flex-none"
              variant={active === "excluded" ? "default" : "ghost"}
              onClick={() => setActive("excluded")}
            >
              <X className="size-4" />
              غير مشمولة ({excluded.length})
            </Button>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="مثال: الإعلامية أو 523"
              className="pr-11"
            />
          </div>
        </div>
      </CardHeader>

      {active === "excluded" && (
        <div className="mx-4 mt-4 flex gap-3 rounded-lg bg-brand-peach/45 p-4 text-sm leading-6 text-body md:mx-6">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-error" />
          <p>هذه الشعب لا يُسند لمن يطلبها التنفيل الجغرافي، حتى عند وجودها في نفس الولاية.</p>
        </div>
      )}

      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-soft hover:bg-surface-soft">
              <TableHead className="w-32 px-6">الرمز الوطني</TableHead>
              <TableHead className="px-6">الشعبة الوطنية</TableHead>
              <TableHead className="w-28 px-6 text-right">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((license) => (
              <TableRow key={`${active}-${license.code}`}>
                <TableCell className="px-6 font-mono font-semibold tabular-nums">{license.code}</TableCell>
                <TableCell className="px-6 whitespace-normal font-medium leading-6">{license.name}</TableCell>
                <TableCell className="px-6 text-right">
                  <span
                    dir={active === "eligible" ? "ltr" : "rtl"}
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    active === "eligible"
                      ? "bg-brand-lavender/60 text-ink"
                      : "bg-brand-coral/15 text-error"
                  }`}
                  >
                    {active === "eligible" ? "+7%" : "مستثناة"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-muted-text">لا توجد شعبة مطابقة لبحثك.</div>
        )}
      </CardContent>
    </Card>
  );
}
