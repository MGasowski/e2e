/**
 * Compact numbers with a lowercase unit: 620 -> "620", 4289 -> "4.3k",
 * 10401 -> "10k", 366092 -> "366k", 1_200_000 -> "1.2M".
 */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value < 1000) return String(Math.round(value));
  if (value < 10_000) return `${trimDecimal(value / 1000)}k`;
  if (value < 1_000_000) return `${Math.round(value / 1000)}k`;
  return `${trimDecimal(value / 1_000_000)}M`;
}

function trimDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Full number with thousands separators: 316207 -> "316,207". */
export function formatWholeNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
