import { DEFAULT_EVENT_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_TAG_OPTIONS, STORAGE_KEYS } from "../lib/constants";

function readLocal(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function loadSettings() {
  return {
    statusOptions: readLocal(STORAGE_KEYS.statusOptions, DEFAULT_STATUS_OPTIONS),
    tagOptions: readLocal(STORAGE_KEYS.tagOptions, DEFAULT_TAG_OPTIONS),
    eventTypes: readLocal(STORAGE_KEYS.eventTypes, DEFAULT_EVENT_TYPES),
    mode: "browser_local_storage",
  };
}

export async function saveSettings({ statusOptions, tagOptions, eventTypes }) {
  writeLocal(STORAGE_KEYS.statusOptions, statusOptions);
  writeLocal(STORAGE_KEYS.tagOptions, tagOptions);
  writeLocal(STORAGE_KEYS.eventTypes, eventTypes);
  return { mode: "browser_local_storage" };
}
