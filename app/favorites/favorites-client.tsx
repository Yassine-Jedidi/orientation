"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import { useFavorites } from "@/lib/use-favorites";
import type { ScoreRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  initialData: ScoreRecord[];
}

export function FavoritesClient({ initialData }: Props) {
  const { favorites, toggleFavorite, clearFavorites } = useFavorites();

  const favoriteRecords = useMemo(() => {
    return initialData.filter((r) => favorites.has(`${r.code}|${r.bacType}`));
  }, [initialData, favorites]);

  if (favoriteRecords.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Heart className="size-12 text-muted-soft" />
            <p className="text-body text-muted-text">لا توجد إجازات في المفضلة بعد</p>
            <Button variant="brand-mint" nativeButton={false} render={<Link href="/" />}>
              العودة إلى دليل التوجيه
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {favoriteRecords.length} {favoriteRecords.length === 1 ? "إجازة" : "إجازات"} في المفضلة
            </CardTitle>
            <Button variant="outline" onClick={clearFavorites}>
              <X className="size-4" /> حذف الكل
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">الرمز</TableHead>
                <TableHead>الإجازة</TableHead>
                <TableHead className="hidden md:table-cell">الجامعة</TableHead>
                <TableHead className="w-[120px]">شعبة الباكالوريا</TableHead>
                <TableHead className="w-[80px] text-right">النقاط</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {favoriteRecords.map((r, i) => (
                <TableRow key={`${r.code}-${r.bacType}-${i}`}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="max-w-[210px]">
                    <span className="line-clamp-2 whitespace-normal leading-5 font-medium">
                      {r.license}
                    </span>
                    <span className="block text-xs text-muted-text">
                      {r.institution}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-[190px] md:table-cell">
                    <span className="line-clamp-2 whitespace-normal leading-5">
                      {r.university}
                    </span>
                  </TableCell>
                  <TableCell>{r.bacType}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums" dir="ltr">
                    {r.score ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(r.code, r.bacType)}
                      aria-label="إزالة من المفضلة"
                    >
                      <X className="size-4 text-muted-text hover:text-error" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
