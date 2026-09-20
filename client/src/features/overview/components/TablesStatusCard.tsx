import { useMemo } from "react"
import { Cell, Pie, PieChart } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { ChartContainer, ChartLegend, ChartTooltip, type ChartConfig } from "../ui/chart"
import { ChartTooltipContent } from "../ui/chart-tooltip"
import { ChartLegendContent } from "../ui/chart-legend"
import { tableLabel } from "@/lib/format"
import type { TableStatus } from "@/lib/types"
import { TABLE_FILL } from "./charts"

const ORDER: TableStatus[] = ["available", "reserved", "occupied", "cleaning", "unavailable"]

export function TablesDonutCard({
  tables,
  title = "Tables right now",
  description = "Live capacity by table state.",
}: {
  tables: Record<TableStatus, number>
  title?: string
  description?: string
}) {
  const { data, config, total } = useMemo(() => {
    const rows = ORDER.map((status) => ({
      status,
      label: tableLabel(status),
      value: tables[status] ?? 0,
      fill: TABLE_FILL[status] ?? "#a3a3a3",
    })).filter((row) => row.value > 0)
    const nextConfig: ChartConfig = {}
    for (const row of rows) {
      nextConfig[row.status] = { label: `${row.label} (${row.value})`, color: row.fill }
    }
    return {
      data: rows,
      config: nextConfig,
      total: ORDER.reduce((sum, status) => sum + (tables[status] ?? 0), 0),
    }
  }, [tables])

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No tables tracked yet.</p>
        </CardContent>
      </Card>
    )
  }

  const free = (tables.available ?? 0) + (tables.reserved ?? 0)
  const freeShare = total > 0 ? Math.round((free / total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="mx-auto aspect-square max-h-[280px] w-full">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={data} dataKey="value" nameKey="status" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={2}>
              {data.map((row) => (
                <Cell key={row.status} fill={row.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="status" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {total} tables · {freeShare}% available or reserved
      </CardFooter>
    </Card>
  )
}
