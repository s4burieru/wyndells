import { useMemo } from "react"
import { StarIcon } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { ChartTooltipContent } from "@/components/ui/chart-tooltip"
import type { Overview } from "@/types"

type BranchRow = {
  branch: { id: string; name: string }
  reservations: number
  confirmed: number
  completed: number
  completionRate: number
  averageRating: number
  feedbackCount: number
}

const radarConfig = {
  reservations: { label: "Reservations", color: "#f0810d" },
  confirmed: { label: "Confirmed", color: "#168b48" },
  completed: { label: "Completed", color: "#0ea5e9" },
} satisfies ChartConfig

function normalise(rows: BranchRow[]) {
  const maxReservations = Math.max(...rows.map((row) => row.reservations), 1)
  const maxConfirmed = Math.max(...rows.map((row) => row.confirmed), 1)
  const maxCompleted = Math.max(...rows.map((row) => row.completed), 1)
  return rows.map((row) => ({
    branch: row.branch.name.length > 14 ? `${row.branch.name.slice(0, 13)}…` : row.branch.name,
    fullName: row.branch.name,
    reservations: Math.round((row.reservations / maxReservations) * 100),
    confirmed: Math.round((row.confirmed / maxConfirmed) * 100),
    completed: Math.round((row.completed / maxCompleted) * 100),
    raw: row,
  }))
}

export function BranchPerformanceCard({
  overview,
  title = "Branch performance comparison",
  description = "Reservations, confirmations and completions normalised per metric.",
}: {
  overview: Extract<Overview, { role: "admin" }>
  title?: string
  description?: string
}) {
  const rows = overview.branchPerformance
  const data = useMemo(() => normalise(rows), [rows])
  const best = useMemo(() => {
    if (rows.length === 0) return null
    return rows.reduce((top, row) => (row.reservations > top.reservations ? row : top), rows[0])
  }, [rows])

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No branch data yet.</p>
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
        <ChartContainer config={radarConfig} className="mx-auto aspect-square max-h-[320px] w-full">
          <RadarChart accessibilityLayer data={data} outerRadius="72%">
            <PolarGrid />
            <PolarAngleAxis dataKey="branch" tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const first = payload?.[0] as unknown as
                      | { payload?: { fullName?: string } }
                      | undefined
                    return first?.payload?.fullName ?? ""
                  }}
                />
              }
            />
            <Radar dataKey="reservations" fill="var(--color-reservations)" fillOpacity={0.25} stroke="var(--color-reservations)" strokeWidth={2} />
            <Radar dataKey="confirmed" fill="var(--color-confirmed)" fillOpacity={0.2} stroke="var(--color-confirmed)" strokeWidth={2} />
            <Radar dataKey="completed" fill="var(--color-completed)" fillOpacity={0.2} stroke="var(--color-completed)" strokeWidth={2} />
          </RadarChart>
        </ChartContainer>
        <ul className="mt-4 space-y-2.5">
          {rows.map((row) => (
            <li key={row.branch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{row.branch.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.reservations} reservations · {row.completed} completed · {row.completionRate}% completion
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <StarIcon className="size-4 fill-wyndell-sun text-wyndell-sun" aria-hidden />
                {row.averageRating}
                <span className="font-normal text-muted-foreground">({row.feedbackCount})</span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {best ? (
          <>
            Leading branch <span className="font-semibold text-foreground">{best.branch.name}</span> with{" "}
            {best.reservations} reservations.
          </>
        ) : null}
      </CardFooter>
    </Card>
  )
}
