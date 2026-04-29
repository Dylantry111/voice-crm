export function asDate(input) {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateInputValue(input) {
  const date = asDate(input);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateKey(input) {
  return formatDateInputValue(input);
}

export function formatHeaderDate(input) {
  const date = asDate(input);
  if (!date) return "";
  return date.toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatSlotTimeRange(startInput, endInput) {
  const start = asDate(startInput);
  const end = asDate(endInput);
  if (!start || !end) return "";

  const format = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return `${format(start)} - ${format(end)}`;
}
