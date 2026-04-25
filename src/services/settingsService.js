export async function loadSettings() {
  return {
    mode: "database_missing_fallback",
    statusOptions: ["New Lead", "Contacted", "Quoted", "Won", "Lost"],
    tagOptions: ["Hot", "Follow-up", "Repeat"],
    eventTypes: [{ name: "Measure" }, { name: "Install" }, { name: "Call" }],
  };
}

export async function saveSettings(nextSettings) {
  return nextSettings;
}
