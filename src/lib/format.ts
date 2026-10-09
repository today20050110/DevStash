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

const FILE_SIZE_UNITS = ["KB", "MB", "GB"];

// "512 B", "1.5 KB", "10 MB" — one decimal place, dropped when it is .0
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < FILE_SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${Number(value.toFixed(1))} ${FILE_SIZE_UNITS[unit]}`;
}
