"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverPortal = PopoverPrimitive.Portal

function PopoverPositioner({ className, ...props }: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPrimitive.Positioner
      className={cn("z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)", className)}
      {...props}
    />
  )
}

function PopoverPopup({ className, ...props }: PopoverPrimitive.Popup.Props) {
  return (
    <PopoverPrimitive.Popup
      className={cn(
        "relative rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-sm outline-none origin-(--transform-origin) transition-[transform,opacity] duration-100 ease-out data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95",
        className,
      )}
      {...props}
    />
  )
}

function PopoverArrow({ className, ...props }: PopoverPrimitive.Arrow.Props) {
  return (
    <PopoverPrimitive.Arrow
      className={cn(
        "relative block h-2 w-4 fill-popover stroke-border data-[side=bottom]:-top-px data-[side=left]:-right-px data-[side=right]:-left-px data-[side=top]:-bottom-px",
        className,
      )}
      {...props}
    />
  )
}

export { Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup, PopoverArrow }
