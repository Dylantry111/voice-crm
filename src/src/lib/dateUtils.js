export function formatDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatSelectedDateLabel(date) {
  return new Date(date).toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatHeaderDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target - today) / 86400000);

  const label =
    diffDays === 0
      ? "Today"
      : diffDays === 1
      ? "Tomorrow"
      : diffDays === -1
      ? "Yesterday"
      : target.toLocaleDateString("en-NZ", { weekday: "short" });

  const datePart = target.toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return diffDays === 0 || diffDays === 1 || diffDays === -1
    ? `${label} · ${datePart}`
    : datePart;
}

export function formatSlotTimeRange(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const formatPart = (d) =>
    d.toLocaleTimeString("en-NZ", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  return `${formatPart(start)} - ${formatPart(end)}`;
}

export function slotToDateRange(selectedDate, slot) {
  const match = slot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, sh, sm, eh, em] = match;
  const base = new Date(selectedDate);
  base.setHours(0, 0, 0, 0);

  const start = new Date(base);
  start.setHours(Number(sh), Number(sm), 0, 0);

  const end = new Date(base);
  end.setHours(Number(eh), Number(em), 0, 0);

  return { start, end };
}
