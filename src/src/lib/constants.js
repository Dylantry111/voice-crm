export const DEFAULT_STATUS_OPTIONS = [
  { id: "new", name: "New", color: "bg-slate-100 text-slate-700" },
  { id: "contacted", name: "Contacted", color: "bg-blue-100 text-blue-700" },
  { id: "measured", name: "Measured", color: "bg-amber-100 text-amber-700" },
  { id: "quoted", name: "Quoted", color: "bg-purple-100 text-purple-700" },
  { id: "followup", name: "Follow-up", color: "bg-cyan-100 text-cyan-700" },
  { id: "won", name: "Won", color: "bg-emerald-100 text-emerald-700" },
  { id: "lost", name: "Lost", color: "bg-rose-100 text-rose-700" },
  { id: "closed", name: "Closed", color: "bg-zinc-100 text-zinc-700" },
];

export const DEFAULT_TAG_OPTIONS = [
  { id: "vip", name: "VIP", color: "bg-rose-100 text-rose-700" },
  { id: "hot", name: "Hot", color: "bg-orange-100 text-orange-700" },
  { id: "high-budget", name: "High Budget", color: "bg-violet-100 text-violet-700" },
  { id: "repeat", name: "Repeat", color: "bg-sky-100 text-sky-700" },
  { id: "follow-up", name: "Follow-up", color: "bg-cyan-100 text-cyan-700" },
];

export const DEFAULT_EVENT_TYPES = [
  { id: "measure", name: "Measure", minutes: 60, color: "bg-slate-900 text-white" },
  { id: "quote", name: "Quote", minutes: 30, color: "bg-blue-600 text-white" },
  { id: "repair", name: "Repair", minutes: 60, color: "bg-amber-500 text-white" },
  { id: "installation", name: "Installation", minutes: 120, color: "bg-emerald-600 text-white" },
];

export const ALL_TIME_SLOTS = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
];

export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "capture", label: "Capture" },
  { key: "contacts", label: "Contacts" },
  { key: "calendar", label: "Calendar" },
  { key: "settings", label: "Settings" },
  { key: "export", label: "Export" },
];
