"use client";

import { useMemo, useState } from "react";
import { BookPlus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AddedLicense, RemovedLicense } from "./page";
import { normalizeArabicSearch } from "@/lib/arabic-search";

type ComparisonView = "removed" | "added";

export function RemovedLicensesDirectory({
  licenses,
  addedLicenses,
}: {
  licenses: RemovedLicense[];
  addedLicenses: AddedLicense[];
}) {
  const [view, setView] = useState<ComparisonView>("removed");
  const [query, setQuery] = useState("");
  const [university, setUniversity] = useState("all");
  const universities = useMemo(
    () => [...new Set(licenses.map((license) => license.university))].sort((a, b) => a.localeCompare(b, "ar")),
    [licenses],
  );

  const filtered = useMemo(() => {
    const needle = normalizeArabicSearch(query);
    return licenses.filter((license) => {
      const matchesQuery = !needle || [license.code, license.license, license.institution, license.university]
        .some((value) => normalizeArabicSearch(value).includes(needle));
      return matchesQuery && (university === "all" || license.university === university);
    });
  }, [licenses, query, university]);

  const filteredAdded = useMemo(() => {
    const needle = normalizeArabicSearch(query);
    if (!needle) return addedLicenses;
    return addedLicenses.filter((license) =>
      [
        license.code,
        license.license,
        license.institution,
        license.university,
        String(license.guidePage),
      ]
        .some((value) => normalizeArabicSearch(value).includes(needle)),
    );
  }, [addedLicenses, query]);

  const resultCount = view === "removed" ? filtered.length : filteredAdded.length;

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
            <CardTitle className="text-title-lg">مقارنة الشعب بين الدليلين</CardTitle>
            <CardDescription className="mt-2">
              {view === "removed"
                ? "ابحث بالرمز أو اسم الشعبة أو المؤسسة، ثم صفِّ النتائج حسب الجامعة."
                : "ابحث في الشعب والرموز التي ظهرت لأول مرة في دليل 2026."}
            </CardDescription>
          </div>
          <span className="w-fit rounded-full bg-surface-card px-3 py-1.5 text-caption font-semibold text-ink">
            {resultCount} نتيجة
          </span>
        </div>

        <div className="flex w-full gap-2 rounded-lg bg-surface-card p-1 sm:w-fit">
          <Button className="flex-1 sm:flex-none" variant={view === "removed" ? "default" : "ghost"} onClick={() => { setView("removed"); clearFilters(); }}>
            غير مدرجة في 2026 ({licenses.length})
          </Button>
          <Button className="flex-1 sm:flex-none" variant={view === "added" ? "default" : "ghost"} onClick={() => { setView("added"); clearFilters(); }}>
            <BookPlus className="size-4" /> جديدة في 2026 ({addedLicenses.length})
          </Button>
        </div>

        <div className={`grid gap-3 ${view === "removed" ? "lg:grid-cols-[minmax(260px,1fr)_280px_auto]" : "lg:grid-cols-[minmax(260px,1fr)_auto]"}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "removed" ? "مثال: علوم البحار أو 20846" : "مثال: المعلوماتية الحيوية أو 10511"} className="w-full pr-11" />
          </div>
          {view === "removed" && <Select value={university} onValueChange={(value) => setUniversity(value ?? "all")}>
            <SelectTrigger className="w-full">
              <SelectValue>{university === "all" ? "كل الجامعات" : university}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start" showScrollbar>
              <SelectItem value="all">كل الجامعات</SelectItem>
              {universities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>}
          <Button variant="outline" onClick={clearFilters} disabled={!hasFilters}>
            <X className="size-4" /> مسح
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {view === "removed" ? <Table>
          <TableHeader>
            <TableRow className="bg-surface-soft hover:bg-surface-soft">
              <TableHead className="w-28 px-6">الرمز</TableHead>
              <TableHead className="min-w-64 px-6">الشعبة</TableHead>
              <TableHead className="min-w-64 px-6">المؤسسة</TableHead>
              <TableHead className="min-w-52 px-6">الجامعة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((license) => (
              <TableRow key={license.code}>
                <TableCell className="px-6 font-mono font-semibold tabular-nums" dir="ltr">{license.code}</TableCell>
                <TableCell className="px-6 whitespace-normal font-medium leading-7">{license.license}</TableCell>
                <TableCell className="px-6 whitespace-normal">
                  <span className="block leading-6 text-body-strong">{license.institution}</span>
                </TableCell>
                <TableCell className="px-6 whitespace-normal leading-6 text-body">{license.university}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table> : <Table>
          <TableHeader>
            <TableRow className="bg-surface-soft hover:bg-surface-soft">
              <TableHead className="w-32 px-6">الرمز الجديد</TableHead>
              <TableHead className="min-w-64 px-6">الشعبة</TableHead>
              <TableHead className="min-w-64 px-6">المؤسسة</TableHead>
              <TableHead className="min-w-48 px-6">الجامعة</TableHead>
              <TableHead className="w-36 px-6">صفحة الدليل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdded.map((license) => (
              <TableRow key={license.code}>
                <TableCell className="px-6 font-mono font-semibold tabular-nums" dir="ltr">{license.code}</TableCell>
                <TableCell className="px-6 whitespace-normal font-medium leading-7">{license.license}</TableCell>
                <TableCell className="px-6 whitespace-normal leading-6">{license.institution}</TableCell>
                <TableCell className="px-6 whitespace-normal leading-6 text-body">{license.university}</TableCell>
                <TableCell className="px-6 tabular-nums">{license.guidePage}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>}
        {resultCount === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="font-medium text-body-strong">لا توجد نتائج مطابقة</p>
            <p className="mt-2 text-sm text-muted-text">جرّب كلمة بحث أخرى أو امسح عوامل التصفية.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
