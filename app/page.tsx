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

type SortDir = "desc" | "asc";

export default function Home() {
  const [data, setData] = useState<ScoreRecord[]>([]);
  const [search, setSearch] = useState("");
  const [bacType, setBacType] = useState<string>("all");
  const [university, setUniversity] = useState<string>("all");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={bacType} onValueChange={(v) => v && setBacType(v)}>
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
              <Select value={university} onValueChange={(v) => v && setUniversity(v)}>
                <SelectTrigger className="w-full sm:w-56">
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
                onValueChange={(v) => v && setSortDir(v as SortDir)}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              النتائج{" "}
              <span className="text-muted-text text-sm font-normal">
                ({filtered.length} من {data.length})
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
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-text py-12">
                      لا توجد نتائج تطابق بحثك
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r, i) => (
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
