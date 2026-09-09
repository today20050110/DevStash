// Locale and time zone are pinned so the server and the client always agree —
// an unpinned toLocaleDateString() is a classic hydration mismatch.
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso));
}
