// Locale and time zone are pinned so the server and the client always agree —
// an unpinned toLocaleDateString() is a classic hydration mismatch.
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date): string {
  return DATE_FORMATTER.format(date);
}

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

// "September 29, 2026" — for dates that can be more than a year old
export function formatLongDate(date: Date): string {
  return LONG_DATE_FORMATTER.format(date);
}
