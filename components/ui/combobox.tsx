"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type ComboboxProps = {
  items: string[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  className?: string
}

function normalizeArabic(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0640\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLocaleLowerCase("ar")
}

function Combobox({
  items,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
}: ComboboxProps) {
  return (
    <ComboboxPrimitive.Root
      items={items}
      value={value}
      onValueChange={onValueChange}
      filter={(item, query) =>
        normalizeArabic(item).includes(normalizeArabic(query.trim()))
      }
      autoHighlight
    >
      <div className={cn("relative w-full", className)}>
        <SearchIcon className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-text" />
        <ComboboxPrimitive.Input
          aria-label={placeholder}
          placeholder={value ? undefined : searchPlaceholder}
          className="h-11 w-full min-w-0 rounded-md border border-input bg-background py-2 pr-9 pl-10 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <ComboboxPrimitive.Clear
          aria-label="مسح اختيار الشعبة"
          className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-xs text-muted-text transition-colors hover:bg-surface-strong hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 data-[visible=false]:hidden"
        >
          <XIcon className="size-4" />
        </ComboboxPrimitive.Clear>
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          sideOffset={4}
          align="start"
          className="z-50"
        >
          <ComboboxPrimitive.Popup className="w-[var(--anchor-width)] min-w-64 origin-[var(--transform-origin)] overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <ComboboxPrimitive.Empty>
              <span className="block px-4 py-6 text-center text-sm text-muted-text">
                {emptyMessage}
              </span>
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="max-h-72 overflow-y-auto p-1 [scrollbar-color:var(--brand-ochre)_var(--popover)] [scrollbar-width:thin]">
              {(item: string, index: number) => (
                <ComboboxPrimitive.Item
                  key={item}
                  value={item}
                  index={index}
                  className="relative flex cursor-default items-center rounded-xs py-2 pr-3 pl-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="line-clamp-1">{item}</span>
                  <ComboboxPrimitive.ItemIndicator className="absolute left-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { Combobox }
