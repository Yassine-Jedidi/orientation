"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RemovedLicense } from "./page";

export function RemovedLicensesDirectory({ licenses }: { licenses: RemovedLicense[] }) {
  const [query, setQuery] = useState("");
  const [university, setUniversity] = useState("all");
  const universities = useMemo(
    () => [...new Set(licenses.map((license) => license.university))].sort((a, b) => a.localeCompare(b, "ar")),
    [licenses],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ar");
    return licenses.filter((license) => {
      const matchesQuery = !needle || [license.code, license.license, license.institution, license.university]
        .some((value) => value.toLocaleLowerCase("ar").includes(needle));
      return matchesQuery && (university === "all" || license.university === university);
    });
  }, [licenses, query, university]);

  const hasFilters = query !== "" || university !== "all";
  const clearFilters = () => {
    setQuery("");
    setUniversity("all");
  };

  return (
    <Card className="overflow-hidden bg-canvas">
      <CardHeader className="gap-5 border-b border-border pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-title-lg">دليل الشعب الغائبة</CardTitle>
            <CardDescription className="mt-2">
            ابحث بالرمز أو اسم الشعبة أو المؤسسة، ثم صفِّ النتائج حسب الجامعة.
            </CardDescription>
          </div>
          <span className="w-fit rounded-full bg-surface-card px-3 py-1.5 text-caption font-semibold text-ink">
            {filtered.length} نتيجة
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_280px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: علوم البحار أو 20846" className="w-full pr-11" />
          </div>
          <Select value={university} onValueChange={(value) => setUniversity(value ?? "all")}>
            <SelectTrigger className="w-full">
              <SelectValue>{university === "all" ? "كل الجامعات" : university}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start" showScrollbar>
              <SelectItem value="all">كل الجامعات</SelectItem>
              {universities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters} disabled={!hasFilters}>
            <X className="size-4" /> مسح
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-soft hover:bg-surface-soft">
              <TableHead className="w-28 px-6">الرمز</TableHead>
              <TableHead className="min-w-64 px-6">الشعبة</TableHead>
              <TableHead className="min-w-72 px-6">المؤسسة والجامعة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((license) => (
              <TableRow key={license.code}>
                <TableCell className="px-6 font-mono font-semibold tabular-nums" dir="ltr">{license.code}</TableCell>
                <TableCell className="px-6 whitespace-normal font-medium leading-7">{license.license}</TableCell>
                <TableCell className="px-6 whitespace-normal">
                  <span className="block leading-6 text-body-strong">{license.institution}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-text">{license.university}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="font-medium text-body-strong">لا توجد نتائج مطابقة</p>
            <p className="mt-2 text-sm text-muted-text">جرّب كلمة بحث أخرى أو امسح عوامل التصفية.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
