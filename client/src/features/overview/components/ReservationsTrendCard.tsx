import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { ChartTooltipContent } from "@/components/ui/chart-tooltip"
import { ChartLegendContent } from "@/components/ui/chart-legend"
import { formatDate } from "@/utils/format"
import type { ReservationTrendPoint } from "@/types"

function shortDay(date: string): string {
  return formatDate(date).replace(/, \d{4}$/, "")
}

const trendConfig = {
  total: { label: "Total bookings", color: "#F58000" },
  confirmed: { label: "Confirmed", color: "#168b48" },
  completed: { label: "Completed", color: "#0ea5e9" },
} satisfies ChartConfig


export function ReservationsTrendCard({
  trend,
  title = "Reservations · last 14 days",
  description = "Total bookings by day, with confirmed and completed overlay.",
}: {
  trend: ReservationTrendPoint[]
  title?: string
  description?: string
}) {
  const data = useMemo(
    () =>
      trend.map((point) => ({
        ...point,
        label: shortDay(point.date),
        fullLabel: formatDate(point.date),
      })),
    [trend],
  )
  const summary = useMemo(() => {
    const total = data.reduce((sum, point) => sum + point.total, 0)
    const peak = data.reduce(
      (best, point) => (point.total > best.total ? point : best),
      { total: 0, label: "—", fullLabel: "—" },
    )
    return {
      total,
      average: data.length > 0 ? Math.round((total / data.length) * 10) / 10 : 0,
      peak,
    }
  }, [data])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reservation activity in this period yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillConfirmed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-confirmed)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-confirmed)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={20} />
            <YAxis width={32} tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const first = payload?.[0] as unknown as
                      | { payload?: { fullLabel?: string } }
                      | undefined
                    return first?.payload?.fullLabel ?? ""
                  }}
                />
              }
            />
            <Area dataKey="completed" type="monotone" fill="url(#fillCompleted)" stroke="var(--color-completed)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Area dataKey="confirmed" type="monotone" fill="url(#fillConfirmed)" stroke="var(--color-confirmed)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Area dataKey="total" type="monotone" fill="url(#fillTotal)" stroke="var(--color-total)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          14-day total <span className="font-semibold text-foreground">{summary.total}</span>
        </span>
        <span className="text-muted-foreground">
          Daily avg <span className="font-semibold text-foreground">{summary.average}</span>
        </span>
        <span className="text-muted-foreground">
          Peak <span className="font-semibold text-foreground">{summary.peak.fullLabel} ({summary.peak.total})</span>
        </span>
      </CardFooter>
    </Card>
  )
}
