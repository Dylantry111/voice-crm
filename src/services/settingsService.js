import { DEFAULT_EVENT_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_TAG_OPTIONS } from "../lib/constants";

export async function loadSettings() {
  return {
    statusOptions: DEFAULT_STATUS_OPTIONS,
    tagOptions: DEFAULT_TAG_OPTIONS,
    eventTypes: DEFAULT_EVENT_TYPES,
    mode: "local_defaults",
  };
}
