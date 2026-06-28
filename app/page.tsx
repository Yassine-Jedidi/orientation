"use client";

import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { ScoreRecord } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";

type SortDir = "desc" | "asc";

interface LicenseGroup {
  key: string;
  university: string;
  institution: string;
  code: string;
  license: string;
  branches: ScoreRecord[];
}

const ROWS_PER_PAGE = 25;
const LICENSES_PER_PAGE = 10;

function groupByLicense(records: ScoreRecord[]): LicenseGroup[] {
  const groups = new Map<string, LicenseGroup>();

  records.forEach((record) => {
    const key = [
      record.university,
      record.institution,
      record.code,
      record.license,
    ].join("\u0000");
    const group = groups.get(key);

    if (group) {
      group.branches.push(record);
      return;
    }

    groups.set(key, {
      key,
      university: record.university,
      institution: record.institution,
      code: record.code,
      license: record.license,
      branches: [record],
    });
  });

  return [...groups.values()];
}

export default function Home() {
  const [data, setData] = useState<ScoreRecord[]>([]);
  const [search, setSearch] = useState("");
  const [bacType, setBacType] = useState<string>("all");
  const [university, setUniversity] = useState<string>("all");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupedView, setGroupedView] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/data/scores.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const universities = useMemo(
    () => [...new Set(data.map((r) => r.university))].sort(),
    [data]
  );

  const bacTypes = useMemo(
    () => [...new Set(data.map((r) => r.bacType))].sort(),
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => {
        if (bacType !== "all" && r.bacType !== bacType) return false;
        if (university !== "all" && r.university !== university) return false;
        if (q) {
          const match =
            r.institution.toLowerCase().includes(q) ||
            r.license.toLowerCase().includes(q) ||
            r.code.includes(q) ||
            r.university.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => (sortDir === "desc" ? b.score - a.score : a.score - b.score));
  }, [data, search, bacType, university, sortDir]);

  const filteredLicenseGroups = useMemo(() => groupByLicense(filtered), [filtered]);
  const resultCount = groupedView ? filteredLicenseGroups.length : filtered.length;
  const pageSize = groupedView ? LICENSES_PER_PAGE : ROWS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(resultCount / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(start, start + ROWS_PER_PAGE);
  }, [filtered, page]);

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * LICENSES_PER_PAGE;
    return filteredLicenseGroups.slice(start, start + LICENSES_PER_PAGE);
  }, [filteredLicenseGroups, page]);

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-canvas">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <h1 className="text-display-sm font-heading font-medium text-ink">
            دليل التوجيه الجامعي
          </h1>
          <p className="mt-2 text-body">
            استشارة معدلات التوجيه حسب الشعب والباكالوريا
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>بحث وتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
                <Input
                  placeholder="بحث بالمؤسسة أو الإجازة أو الرمز..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pr-9"
                />
              </div>
              <Select
                value={bacType}
                onValueChange={(v) => {
                  if (!v) return;
                  setBacType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="الباكالوريا">
                    {bacType === "all" ? "كل الشعب" : bacType}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الشعب</SelectItem>
                  {bacTypes.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={university}
                onValueChange={(v) => {
                  if (!v) return;
                  setUniversity(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="الجامعة">
                    {university === "all" ? "كل الجامعات" : university}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent listClassName="max-h-72">
                  <SelectItem value="all">كل الجامعات</SelectItem>
                  {universities.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortDir}
                onValueChange={(v) => {
                  if (!v) return;
                  setSortDir(v as SortDir);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="الترتيب">
                    {sortDir === "desc" ? "الأعلى أولا" : "الأدنى أولا"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">الأعلى أولا</SelectItem>
                  <SelectItem value="asc">الأدنى أولا</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 flex items-center justify-start border-t border-border pt-4">
              <button
                type="button"
                role="switch"
                aria-checked={groupedView}
                onClick={() => {
                  setGroupedView((active) => !active);
                  setPage(1);
                }}
                className="group inline-flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-strong/70 focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-6 w-11 rounded-pill border transition-colors ${
                    groupedView
                      ? "border-brand-ochre bg-brand-ochre"
                      : "border-border bg-canvas"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-[18px] rounded-full bg-ink transition-transform ${
                      groupedView ? "right-[21px]" : "right-0.5"
                    }`}
                  />
                </span>
                تجميع الشعب حسب الإجازة
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              النتائج{" "}
              <span className="text-muted-text text-sm font-normal">
                {groupedView
                  ? `(${filteredLicenseGroups.length} إجازة · ${filtered.length} شعبة بكالوريا)`
                  : `(${filtered.length} نتيجة)`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">الرمز</TableHead>
                  <TableHead className="w-[180px]">الجامعة</TableHead>
                  <TableHead className="hidden md:table-cell w-[250px]">المؤسسة</TableHead>
                  <TableHead className="w-[200px]">الإجازة</TableHead>
                  <TableHead className="w-[120px]">شعبة الباكالوريا</TableHead>
                  <TableHead className="w-[80px] text-right">المعدل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-text py-12">
                      لا توجد نتائج تطابق بحثك
                    </TableCell>
                  </TableRow>
                ) : groupedView ? (
                  paginatedGroups.map((group) =>
                    group.branches.map((branch, branchIndex) => (
                      <TableRow
                        key={`${group.key}-${branch.bacType}-${branchIndex}`}
                        className={branchIndex === 0 ? "border-t border-border" : "border-border/60"}
                      >
                        {branchIndex === 0 && (
                          <>
                            <TableCell
                              rowSpan={group.branches.length}
                              className="align-top font-mono text-xs"
                            >
                              {group.code}
                            </TableCell>
                            <TableCell
                              rowSpan={group.branches.length}
                              className="align-top"
                            >
                              {group.university}
                            </TableCell>
                            <TableCell
                              rowSpan={group.branches.length}
                              className="hidden max-w-xs truncate align-top md:table-cell"
                            >
                              {group.institution}
                            </TableCell>
                            <TableCell
                              rowSpan={group.branches.length}
                              className="max-w-40 truncate align-top font-medium"
                            >
                              {group.license}
                            </TableCell>
                          </>
                        )}
                        <TableCell>{branch.bacType}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {branch.score.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  paginatedRows.map((r, i) => (
                    <TableRow key={`${r.code}-${r.bacType}-${i}`}>
                      <TableCell className="font-mono text-xs">
                        {r.code}
                      </TableCell>
                      <TableCell>{r.university}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {r.institution}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {r.license}
                      </TableCell>
                      <TableCell>{r.bacType}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {r.score.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <div className="border-t border-border flex min-h-14 items-center justify-center px-4 py-2">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </Card>
      </main>

      <footer className="border-t border-border bg-surface-soft">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-body">
          البيانات مأخوذة من دليل التوجيه الجامعي التونسي 2025-2026
        </div>
      </footer>
    </div>
  );
}
