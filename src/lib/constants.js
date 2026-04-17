export const DEFAULT_STATUS_OPTIONS = [
  { id: "new-lead", name: "New Lead", color: "bg-slate-100 text-slate-700" },
  { id: "in-progress", name: "In Progress", color: "bg-blue-100 text-blue-700" },
  { id: "won", name: "Won", color: "bg-emerald-100 text-emerald-700" },
];

export const DEFAULT_TAG_OPTIONS = [
  { id: "vip", name: "VIP", color: "bg-rose-100 text-rose-700" },
  { id: "follow-up", name: "Follow-up Needed", color: "bg-cyan-100 text-cyan-700" },
  { id: "referral", name: "Referral", color: "bg-violet-100 text-violet-700" },
];

export const DEFAULT_EVENT_TYPES = [
  { id: "measure", name: "Measure", minutes: 60, color: "bg-slate-900 text-white" },
  { id: "quote", name: "Quote", minutes: 30, color: "bg-blue-600 text-white" },
  { id: "repair", name: "Repair", minutes: 60, color: "bg-amber-500 text-white" },
  { id: "installation", name: "Installation", minutes: 120, color: "bg-emerald-600 text-white" },
  { id: "site-visit", name: "Site Visit", minutes: 60, color: "bg-indigo-600 text-white" },
];

export const DURATION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
  { label: "2.5 hours", value: 150 },
  { label: "3 hours", value: 180 },
  { label: "4 hours", value: 240 },
  { label: "5 hours", value: 300 },
  { label: "6 hours", value: 360 },
  { label: "7 hours", value: 420 },
  { label: "8 hours", value: 480 },
];

export const ALL_TIME_SLOTS = [
  "08:00 - 08:30","08:30 - 09:00","09:00 - 09:30","09:30 - 10:00","10:00 - 10:30",
  "10:30 - 11:00","11:00 - 11:30","11:30 - 12:00","12:00 - 12:30","12:30 - 13:00",
  "13:00 - 13:30","13:30 - 14:00","14:00 - 14:30","14:30 - 15:00","15:00 - 15:30",
  "15:30 - 16:00","16:00 - 16:30","16:30 - 17:00",
];

export const STORAGE_KEYS = {
  statusOptions: "crm_status_options_v2",
  tagOptions: "crm_tag_options_v2",
  eventTypes: "crm_event_types_v2",
};

export const FIELD_LIMITS = {
  contactName: 50,
  phone: 20,
  email: 100,
  address: 200,
  shortName: 30,
  locationName: 40,
  requirement: 200,
  notes: 1000,
};
