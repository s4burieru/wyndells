export function pickFields(
  source: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {}
  for (const field of fields) {
    if (source[field] !== undefined) {
      picked[field] = source[field]
    }
  }
  return picked
}