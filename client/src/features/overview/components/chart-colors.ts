/**
 * Chart fills aligned with the badge palette in `utils/format.ts` so the same
 * status always reads the same colour in charts, badges, and table dots.
 */
export const STATUS_FILL: Record<string, string> = {
  pending: "#f9c515", // wyndell-sun
  confirmed: "#12703c", // wyndell-green-dark
  completed: "#0ea5e9", // sky-500
  cancelled: "#a39382", // wyndell-taupe
  rejected: "#dc2626", // destructive
  "no-show": "#a855f7", // purple-500
}

export const TABLE_FILL: Record<string, string> = {
  available: "#12703c", // wyndell-green-dark
  reserved: "#f9c515", // wyndell-sun
  occupied: "#F58000", // wyndell-orange
  cleaning: "#0ea5e9", // sky-500
  unavailable: "#a39382", // wyndell-taupe
}
