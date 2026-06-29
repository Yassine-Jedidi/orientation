"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Menu } from "lucide-react";
import type { ScoreRecord } from "@/lib/types";
import { BAC_ORDER } from "@/lib/bac-order";
import { authClient } from "@/lib/auth-client";
import Avatar, { genConfig } from "react-nice-avatar";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AuthNav } from "@/components/auth/auth-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  return [...groups.values()].map((g) => ({
    ...g,
    branches: [...g.branches].sort(
      (a, b) => BAC_ORDER.indexOf(a.bacType) - BAC_ORDER.indexOf(b.bacType),
    ),
  }));
}

export default function Home() {
  const { data: session } = authClient.useSession();
  const [data, setData] = useState<ScoreRecord[]>([]);
  const [search, setSearch] = useState("");
  const [bacType, setBacType] = useState<string>("all");
  const [university, setUniversity] = useState<string>("all");
  const [institution, setInstitution] = useState<string | null>(null);
  const [license, setLicense] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [minScore, setMinScore] = useState("");
  const [groupedView, setGroupedView] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [userBacType, setUserBacType] = useState<string | null>(null);
  const [onlyMyBac, setOnlyMyBac] = useState(false);

  useEffect(() => {
    fetch("/data/scores.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch("/api/student-score")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.bacType) {
          setUserBacType(payload.bacType);
          setOnlyMyBac(true);
        }
      })
      .catch(() => {});
  }, [session]);

  const bacTypes = useMemo(
    () =>
      [...new Set(data.map((r) => r.bacType))].sort(
        (a, b) => BAC_ORDER.indexOf(a) - BAC_ORDER.indexOf(b),
      ),
    [data],
  );

  const universities = useMemo(() => {
    const available = data.filter(
      (record) =>
        (!institution || record.institution === institution) &&
        (!license || record.license === license),
    );
    return [...new Set(available.map((record) => record.university))].sort();
  }, [data, institution, license]);

  const institutions = useMemo(() => {
    const available = data.filter(
      (record) =>
        (university === "all" || record.university === university) &&
        (!license || record.license === license),
    );
    return [...new Set(available.map((record) => record.institution))].sort();
  }, [data, university, license]);

  const licenses = useMemo(() => {
    const available = data.filter(
      (record) =>
        (university === "all" || record.university === university) &&
        (!institution || record.institution === institution),
    );
    return [...new Set(available.map((record) => record.license))].sort();
  }, [data, university, institution]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((r) => {
        if (bacType !== "all" && r.bacType !== bacType && !onlyMyBac)
          return false;
        if (onlyMyBac && userBacType && r.bacType !== userBacType) return false;
        if (university !== "all" && r.university !== university) return false;
        if (institution && r.institution !== institution) return false;
        if (license && r.license !== license) return false;
        if (minScore && r.score > parseFloat(minScore)) return false;
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
      .sort((a, b) =>
        sortDir === "desc" ? b.score - a.score : a.score - b.score,
      );
  }, [
    data,
    search,
    bacType,
    university,
    institution,
    license,
    minScore,
    sortDir,
    onlyMyBac,
    userBacType,
  ]);

  const filteredLicenseGroups = useMemo(
    () => groupByLicense(filtered),
    [filtered],
  );
  const resultCount = groupedView
    ? filteredLicenseGroups.length
    : filtered.length;
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
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display-sm font-heading font-medium text-ink">
                دليل التوجيه الجامعي
              </h1>
              <p className="mt-2 text-body">
                استشارة معدلات التوجيه حسب الشعب والباكالوريا
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Desktop */}
              <div className="hidden items-center gap-3 sm:flex">
                {session?.user?.name && (
                  <span className="flex items-center gap-2">
                    <Avatar
                      className="size-10 shrink-0"
                      {...genConfig(session.user.email ?? session.user.name)}
                    />
                    <span className="text-sm text-body">{session.user.name}</span>
                  </span>
                )}
                <Button
                  nativeButton={false}
                  render={<Link href="/calculatrice" />}
                >
                  احسب سكورك
                </Button>
                <AuthNav />
              </div>

              {/* Mobile */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                    <Menu className="size-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-48">
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
                    <DropdownMenuItem>
                      <Link href="/calculatrice" className="flex w-full items-center gap-2">
                        احسب سكورك
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-1 py-1">
                      <AuthNav />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>بحث وتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_108px_176px_144px]">
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
              <div className="relative">
                <Input
                  type="number"
                  min="60"
                  max="230"
                  step="0.01"
                  placeholder="النقاط ≤"
                  value={minScore}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== "" && !/^\d+(\.\d*)?$/.test(v)) return;
                    setMinScore(v);
                    setPage(1);
                  }}
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0 [-moz-appearance:textfield]"
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
                <SelectTrigger className="w-full">
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
                value={sortDir}
                onValueChange={(v) => {
                  if (!v) return;
                  setSortDir(v as SortDir);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
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
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-[280px_1fr_1fr]">
              <Select
                value={university}
                onValueChange={(v) => {
                  if (!v) return;
                  setUniversity(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="الجامعة">
                    {university === "all" ? "كل الجامعات" : university}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent listClassName="max-h-72" showScrollbar>
                  <SelectItem value="all">كل الجامعات</SelectItem>
                  {universities.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Combobox
                items={institutions}
                value={institution}
                onValueChange={(value) => {
                  setInstitution(value);
                  setPage(1);
                }}
                placeholder="المؤسسة"
                searchPlaceholder="ابحث عن مؤسسة..."
                emptyMessage="لا توجد مؤسسة مطابقة"
              />
              <Combobox
                items={licenses}
                value={license}
                onValueChange={(value) => {
                  setLicense(value);
                  setPage(1);
                }}
                placeholder="الشعبة الجامعية"
                searchPlaceholder="ابحث عن شعبة جامعية..."
                emptyMessage="لا توجد شعبة مطابقة"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-start gap-3 border-t border-border pt-4">
              {session && userBacType && (
                <label className="inline-flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong/70">
                  <Switch
                    checked={onlyMyBac}
                    onCheckedChange={(v) => {
                      setOnlyMyBac(v);
                      setPage(1);
                    }}
                  />
                  شعبتي فقط
                </label>
              )}
              {(!onlyMyBac || !userBacType) && (
                <label className="inline-flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium text-ink transition-colors hover:bg-surface-strong/70">
                  <Switch
                    checked={groupedView}
                    onCheckedChange={(v) => {
                      setGroupedView(v);
                      setPage(1);
                    }}
                  />
                  تجميع الشعب حسب الإجازة
                </label>
              )}
              {(search ||
                bacType !== "all" ||
                university !== "all" ||
                institution ||
                license ||
                minScore) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setBacType("all");
                    setUniversity("all");
                    setInstitution(null);
                    setLicense(null);
                    setMinScore("");
                    setSortDir("desc");
                    setPage(1);
                  }}
                  className="mr-auto"
                >
                  إلغاء التصفية
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              النتائج{" "}
              <span className="text-muted-text text-sm font-normal">
                {groupedView
                  ? `(${filteredLicenseGroups.length} إجازة)`
                  : `(${filtered.length} ${filtered.length < 10 ? "نتائج" : "نتيجة"})`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">الرمز</TableHead>
                  <TableHead className="w-[200px]">الجامعة</TableHead>
                  <TableHead className="hidden md:table-cell w-[260px]">
                    المؤسسة
                  </TableHead>
                  <TableHead className="w-[220px]">الإجازة</TableHead>
                  <TableHead className="w-[120px]">شعبة الباكالوريا</TableHead>
                  <TableHead className="w-[190px]">الصيغة</TableHead>
                  <TableHead className="w-[80px] text-right">النقاط</TableHead>
                </TableRow>
              </TableHeader>
              {groupedView ? (
                paginatedGroups.map((group) => {
                  const bestIdx = group.branches.reduce(
                    (maxIdx, b, i, arr) =>
                      b.score > arr[maxIdx].score ? i : maxIdx,
                    0,
                  );
                  const isHovered = hoveredGroup === group.key;
                  return (
                    <tbody
                      key={group.key}
                      onMouseEnter={() => setHoveredGroup(group.key)}
                      onMouseLeave={() => setHoveredGroup(null)}
                    >
                      {group.branches.map((branch, branchIndex) => (
                        <TableRow
                          key={`${group.key}-${branch.bacType}-${branchIndex}`}
                          className={`hover:bg-inherit ${branchIndex === 0 ? "border-t border-border" : "border-border/60"} ${isHovered && branchIndex === bestIdx ? "bg-surface-soft/80!" : ""}`}
                        >
                          {branchIndex === 0 && (
                            <>
                              <TableCell
                                rowSpan={group.branches.length}
                                className={`align-top font-mono text-xs ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                              >
                                {group.code}
                              </TableCell>
                              <TableCell
                                rowSpan={group.branches.length}
                                className={`align-top ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                              >
                                {group.university}
                              </TableCell>
                              <TableCell
                                rowSpan={group.branches.length}
                                className={`hidden max-w-xs truncate align-top md:table-cell ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                              >
                                <Tooltip>
                                  <TooltipTrigger delay={500} render={<span />}>
                                    {group.institution}
                                  </TooltipTrigger>
                                  <TooltipPortal>
                                    <TooltipPositioner sideOffset={8}>
                                      <TooltipPopup>
                                        <TooltipArrow />
                                        {group.institution}
                                      </TooltipPopup>
                                    </TooltipPositioner>
                                  </TooltipPortal>
                                </Tooltip>
                              </TableCell>
                              <TableCell
                                rowSpan={group.branches.length}
                                className={`max-w-40 truncate align-top font-medium ${isHovered && bestIdx !== 0 ? "bg-surface-soft/80!" : ""}`}
                              >
                                <Tooltip>
                                  <TooltipTrigger delay={500} render={<span />}>
                                    {group.license}
                                  </TooltipTrigger>
                                  <TooltipPortal>
                                    <TooltipPositioner sideOffset={8}>
                                      <TooltipPopup>
                                        <TooltipArrow />
                                        {group.license}
                                      </TooltipPopup>
                                    </TooltipPositioner>
                                  </TooltipPortal>
                                </Tooltip>
                              </TableCell>
                            </>
                          )}
                          <TableCell>{branch.bacType}</TableCell>
                          <TableCell className="max-w-48 truncate font-mono text-xs">
                            <Tooltip>
                              <TooltipTrigger delay={500} render={<span />}>
                                {branch.formula ?? "—"}
                              </TooltipTrigger>
                              <TooltipPortal>
                                <TooltipPositioner sideOffset={8}>
                                  <TooltipPopup>
                                    <TooltipArrow />
                                    {branch.formula ?? "—"}
                                  </TooltipPopup>
                                </TooltipPositioner>
                              </TooltipPortal>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {branch.score.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  );
                })
              ) : (
                <TableBody>
                  {resultCount === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-text py-12"
                      >
                        لا توجد نتائج تطابق بحثك
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((r, i) => (
                      <TableRow key={`${r.code}-${r.bacType}-${i}`}>
                        <TableCell className="font-mono text-xs">
                          {r.code}
                        </TableCell>
                        <TableCell>{r.university}</TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs truncate">
                          <Tooltip>
                            <TooltipTrigger delay={500} render={<span />}>
                              {r.institution}
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner sideOffset={8}>
                                <TooltipPopup>
                                  <TooltipArrow />
                                  {r.institution}
                                </TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="max-w-40 truncate">
                          <Tooltip>
                            <TooltipTrigger delay={500} render={<span />}>
                              {r.license}
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner sideOffset={8}>
                                <TooltipPopup>
                                  <TooltipArrow />
                                  {r.license}
                                </TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{r.bacType}</TableCell>
                        <TableCell className="max-w-48 truncate font-mono text-xs">
                          <Tooltip>
                            <TooltipTrigger delay={500} render={<span />}>
                              {r.formula ?? "—"}
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner sideOffset={8}>
                                <TooltipPopup>
                                  <TooltipArrow />
                                  {r.formula ?? "—"}
                                </TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {r.score.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              )}
            </Table>
          </CardContent>
          <div className="border-t border-border flex min-h-14 items-center justify-center px-4 py-2">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </Card>
      </main>

      <footer className="border-t border-border bg-surface-soft">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-body">
          البيانات مأخوذة من دليل التوجيه الجامعي التونسي 2025-2026
        </div>
      </footer>
    </div>
  );
}
