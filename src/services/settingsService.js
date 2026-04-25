const STORAGE_KEY = "voice-crm-settings-v1";

const DEFAULT_SETTINGS = {
  mode: "browser_local_storage",
  statusOptions: ["New Lead", "Contacted", "Quoted", "Won", "Lost"],
  tagOptions: ["Hot", "Follow-up", "Repeat"],
  eventTypes: [{ name: "Measure" }, { name: "Install" }, { name: "Call" }],
};

function normalize(settings) {
  return {
    mode: settings?.mode || DEFAULT_SETTINGS.mode,
    statusOptions: Array.isArray(settings?.statusOptions) && settings.statusOptions.length ? settings.statusOptions : DEFAULT_SETTINGS.statusOptions,
    tagOptions: Array.isArray(settings?.tagOptions) && settings.tagOptions.length ? settings.tagOptions : DEFAULT_SETTINGS.tagOptions,
    eventTypes: Array.isArray(settings?.eventTypes) && settings.eventTypes.length ? settings.eventTypes : DEFAULT_SETTINGS.eventTypes,
  };
}

export async function loadSettings() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULT_SETTINGS;
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(nextSettings) {
  const normalized = normalize(nextSettings);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export { DEFAULT_SETTINGS };
