const STORAGE_KEY = "voice-crm-settings-v1";

const DEFAULT_SETTINGS = {
  mode: "browser_local_storage",
  statusOptions: ["New Lead", "Contacted", "Quoted", "Won", "Lost"],
  tagOptions: ["Hot", "Follow-up", "Repeat"],
  eventTypes: [
    { id: "measure", name: "Measure", minutes: 60, isActive: true },
    { id: "install", name: "Install", minutes: 90, isActive: true },
    { id: "call", name: "Call", minutes: 30, isActive: true },
  ],
  savedLocations: [
    { id: "office", name: "Office", address: "", isActive: true },
  ],
};

function normalizeEventTypes(eventTypes) {
  if (!Array.isArray(eventTypes) || !eventTypes.length) return DEFAULT_SETTINGS.eventTypes;
  return eventTypes
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `event-${index + 1}`,
          name: item,
          minutes: 60,
          isActive: true,
        };
      }
      return {
        id: item?.id || `event-${index + 1}`,
        name: item?.name || `Event ${index + 1}`,
        minutes: Number(item?.minutes) > 0 ? Number(item.minutes) : 60,
        isActive: item?.isActive !== false,
      };
    })
    .filter((item) => item.name);
}

function normalizeSavedLocations(savedLocations) {
  if (!Array.isArray(savedLocations) || !savedLocations.length) return DEFAULT_SETTINGS.savedLocations;
  return savedLocations
    .map((item, index) => ({
      id: item?.id || `location-${index + 1}`,
      name: item?.name || item?.label || `Location ${index + 1}`,
      address: item?.address || item?.fullAddress || "",
      isActive: item?.isActive !== false,
    }))
    .filter((item) => item.name);
}

function normalize(settings) {
  return {
    mode: settings?.mode || DEFAULT_SETTINGS.mode,
    statusOptions: Array.isArray(settings?.statusOptions) && settings.statusOptions.length ? settings.statusOptions : DEFAULT_SETTINGS.statusOptions,
    tagOptions: Array.isArray(settings?.tagOptions) && settings.tagOptions.length ? settings.tagOptions : DEFAULT_SETTINGS.tagOptions,
    eventTypes: normalizeEventTypes(settings?.eventTypes),
    savedLocations: normalizeSavedLocations(settings?.savedLocations),
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
