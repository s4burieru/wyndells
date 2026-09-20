"use client"

import { cn } from "@/utils/cn"
import { getPayloadConfigFromPayload, useChart } from "./chart"

export function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  payload?: Array<{
    value?: unknown
    type?: string
    color?: string
    dataKey?: unknown
  }>
  verticalAlign?: "top" | "bottom" | "middle"
  hideIcon?: boolean
  nameKey?: string
}) {
  const { config } = useChart()
  if (!payload?.length) return null
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          return (
            <div key={String(item.value ?? index)} className="flex items-center gap-1.5">
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
    </div>
  )
}
