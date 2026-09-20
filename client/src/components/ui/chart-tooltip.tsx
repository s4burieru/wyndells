"use client"

import * as React from "react"
import { cn } from "@/utils/cn"
import { getPayloadConfigFromPayload, useChart, type TooltipItem } from "./chart"

export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<"div"> & {
  active?: boolean
  payload?: TooltipItem[]
  label?: unknown
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  labelClassName?: string
  color?: string
  labelFormatter?: (label: unknown, payload: TooltipItem[]) => React.ReactNode
  formatter?: (
    value: number | string,
    name: string,
    item: TooltipItem,
    index: number,
    payload: unknown,
  ) => React.ReactNode
}) {
  const { config } = useChart()
  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null
    const [item] = payload
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? ((config[label]?.label as string | undefined) ?? label)
        : ((itemConfig?.label as string | undefined) ?? label)
    if (labelFormatter && payload) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }
    if (!value) return null
    return (
      <div className={cn("font-medium", labelClassName)}>{String(value)}</div>
    )
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  if (!active || !payload?.length) return null
  const nestLabel = payload.length === 1 && indicator !== "dot"
  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor =
            color ?? (item.payload?.fill as string | undefined) ?? item.color
          return (
            <div
              key={String(item.dataKey ?? index)}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2",
                indicator === "dot" && "items-center",
              )}
            >
              {formatter && item.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn("shrink-0 rounded-[2px]", {
                          "size-2.5": indicator === "dot",
                          "h-full w-1": indicator === "line",
                          "w-0 border-[1.5px] border-dashed bg-transparent":
                            indicator === "dashed",
                          "my-0.5": nestLabel && indicator === "dashed",
                        })}
                        style={
                          {
                            backgroundColor: indicatorColor,
                            borderColor: indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div className="flex flex-1 shrink-0 justify-between leading-none">
                    <span className="text-muted-foreground">
                      {(itemConfig?.label as string | undefined) ?? item.name}
                    </span>
                    {item.value !== undefined && (
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {Number(item.value).toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
