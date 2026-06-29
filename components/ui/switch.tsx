"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border border-border bg-canvas transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-brand-ochre data-checked:bg-brand-ochre",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none absolute top-0.5 size-[18px] rounded-full bg-ink shadow-sm ring-0 transition-all right-0.5 group-data-checked:right-[21px]",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
