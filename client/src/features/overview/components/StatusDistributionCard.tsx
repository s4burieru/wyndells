import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { ChartContainer, ChartTooltip, type ChartConfig } from "../ui/chart"
import { ChartTooltipContent } from "../ui/chart-tooltip"
import { reservationLabel } from "@/lib/format"
import type { ReservationStatus } from "@/lib/types"
import { STATUS_FILL } from "./charts"

const ORDER: ReservationStatus[] = ["pending", "confirmed", "completed", "cancelled", "rejected", "no-show"]

export function StatusDistributionCard({
  counts,
  title = "Reservation status distribution",
  description = "Share of every reservation in the current scope.",
}: {
  counts: Record<ReservationStatus, number>
  title?: string
  description?: string
}) {
  const { data, config, total } = useMemo(() => {
    const rows = ORDER.map((status) => ({
      status,
      label: reservationLabel(status),
      value: counts[status] ?? 0,
      fill: STATUS_FILL[status] ?? "#a3a3a3",
    })).filter((row) => row.value > 0)
    const nextConfig: ChartConfig = {}
    for (const row of rows) {
      nextConfig[row.status] = { label: row.label, color: row.fill }
    }
    return {
      data: rows,
      config: nextConfig,
      total: ORDER.reduce((sum, status) => sum + (counts[status] ?? 0), 0),
    }
  }, [counts])

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No reservations to distribute yet.</p>
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
        <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 48 }}>
            <CartesianGrid horizontal={false} />
            <YAxis dataKey="label" type="category" tickLine={false} tickMargin={8} axisLine={false} width={88} />
            <XAxis dataKey="value" type="number" hide />
            <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="value" radius={6}>
              <LabelList dataKey="value" position="right" offset={8} className="fill-foreground" fontSize={12} />
              {data.map((row) => (
                <Cell key={row.status} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {total} reservations · {data.length} active {data.length === 1 ? "status" : "statuses"}
      </CardFooter>
    </Card>
  )
}
