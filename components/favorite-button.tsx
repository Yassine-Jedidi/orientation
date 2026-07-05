"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/use-favorites";

interface FavoriteButtonProps {
  code: string;
  bacType: string;
  size?: "sm" | "xs";
}

export function FavoriteButton({ code, bacType, size = "sm" }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [mounted, setMounted] = useState(false);
  const favorited = mounted && isFavorite(code, bacType);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(code, bacType);
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(code, bacType);
        }
      }}
      className={
        `inline-flex items-center justify-center shrink-0 rounded-full transition-colors cursor-pointer ${
          size === "xs" ? "size-6" : "size-8"
        } ${
          favorited
            ? "text-brand-pink hover:text-brand-pink/80"
            : "text-muted-text hover:text-brand-pink"
        }`
      }
      title={favorited ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
    >
      <Heart
        className={size === "xs" ? "size-3.5" : "size-4"}
        fill={favorited ? "currentColor" : "none"}
      />
      <span className="sr-only">
        {favorited ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
      </span>
    </span>
  );
}
