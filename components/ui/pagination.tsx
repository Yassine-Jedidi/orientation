"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "...")[] = []
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  pages.push(1)
  if (start > 2) pages.push("...")
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push("...")
  pages.push(total)

  return pages
}

function HoverButton({
  className,
  disabled,
  onClick,
  children,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
}: {
  className?: string
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  "aria-label"?: string
  "aria-current"?: React.AriaAttributes["aria-current"]
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "transition-colors hover:bg-brand-ochre/35 focus-visible:ring-2 focus-visible:ring-brand-ochre focus-visible:ring-offset-2",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
    >
      {children}
    </button>
  )
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(page, totalPages)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <nav
      className="mx-auto flex w-fit items-center justify-center gap-1 text-sm font-semibold"
      aria-label="Pagination"
    >
      <HoverButton
        disabled={!hasPrev}
        onClick={() => onPageChange(page - 1)}
        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-foreground"
      >
        <ChevronRight className="size-4" />
        <span>السابق</span>
      </HoverButton>

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`e-${i}`}
            className="flex size-9 items-center justify-center text-muted-text"
          >
            ...
          </span>
        ) : p === page ? (
          <span
            key={p}
            className="flex size-9 items-center justify-center rounded-full bg-brand-ochre text-sm font-semibold text-on-primary"
            aria-current="page"
          >
            {p}
          </span>
        ) : (
          <HoverButton
            key={p}
            onClick={() => onPageChange(p)}
            className="flex size-9 items-center justify-center rounded-full text-sm font-semibold text-foreground"
            aria-label={`الصفحة ${p}`}
          >
            {p}
          </HoverButton>
        ),
      )}

      <HoverButton
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-foreground"
      >
        <span>التالي</span>
        <ChevronLeft className="size-4" />
      </HoverButton>
    </nav>
  )
}
