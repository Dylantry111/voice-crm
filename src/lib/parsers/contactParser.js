export function normalizePhone(value) {
  let digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0064")) digits = "0" + digits.slice(4);
  if (digits.startsWith("64")) digits = "0" + digits.slice(2);
  return digits;
}

export function normalizeEmail(value) {
  return (value || "").trim().toLowerCase();
}

export function normalizeAddress(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[，]/g, ",")
    .replace(/\bmt\b/g, "mount")
    .replace(/\brd\b/g, "road")
    .replace(/\bave\b/g, "avenue")
    .replace(/\bst\b/g, "street")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/[.;]+$/g, "")
    .trim();
}

function cleanupAddress(value) {
  return (value || "")
    .replace(/\bmt\b/gi, "Mount")
    .replace(/\brd\b/gi, "Road")
    .replace(/\bave\b/gi, "Avenue")
    .replace(/\bst\b/gi, "Street")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/[。.;；]+$/g, "")
    .trim();
}

export function preprocessText(text) {
  return (text || "")
    .replace(/\r/g, "")
    .replace(/[，]/g, ",")
    .replace(/[；]/g, ";")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseName(text) {
  const cleaned = preprocessText(text);

  const explicit = cleaned.match(
    /(?:my name is|name is|i'm|i am|this is|customer is|客户姓名|姓名)\s+([A-Za-z][A-Za-z\s'-]{0,40}|[\u4e00-\u9fa5·]{1,12})/i
  );
  if (explicit?.[1]) return explicit[1].trim();

  const prefix = cleaned.split(/\b(?:phone|mobile|tel|email|address|地址)\b/i)[0].trim();
  if (prefix) {
    const shortName = prefix.match(/^([A-Za-z][A-Za-z\s'-]{0,30}|[\u4e00-\u9fa5·]{1,12})$/);
    if (shortName?.[1]) return shortName[1].trim();
  }

  const firstToken = cleaned.match(/^([A-Za-z][A-Za-z'-]{1,20})(?=\s+(?:phone|mobile|tel|email|address)\b)/i);
  if (firstToken?.[1]) return firstToken[1].trim();

  const capitalizedPair = cleaned.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
  if (capitalizedPair?.[1]) return capitalizedPair[1].trim();

  return "";
}

export function parsePhone(text) {
  const contextual = text.match(
    /(?:phone|mobile|tel|number|电话|手机号)\s*(?:is|是|:)?\s*((?:\+?64|0)[\d\s()-]{7,20})(?=\s|$|\n|\.|,)/i
  );
  if (contextual?.[1]) return normalizePhone(contextual[1]);

  const nzMobile = text.match(/(?:\+?64\s*2\d[\d\s()-]{6,}|02\d[\d\s()-]{6,})/i);
  if (!nzMobile?.[0]) return "";
  const digits = normalizePhone(nzMobile[0]);
  return /^0\d{8,10}$/.test(digits) ? digits : "";
}

export function parseEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ? normalizeEmail(match[0]) : "";
}

const ADDRESS_STOP_TOKENS = [
  " wants ", " want ", " needs ", " need ", " looking for ", " quote ",
  " measure ", " installation ", " install ", " repair ", " notes ",
  " requirement ", " email ", " phone ", " mobile ",
];

const STREET_TYPES = "(?:Road|Street|Avenue|Drive|Lane|Place|Court|Terrace|Way|Close|Rd|St|Ave)";

export function parseAddress(text) {
  const cleaned = preprocessText(text);

  const explicit = cleaned.match(/(?:address|住址|地址)\s*(?:is|是|:)?\s*(.+)$/i);
  if (explicit?.[1]) {
    let candidate = explicit[1];
    const lower = ` ${candidate.toLowerCase()} `;
    let endIndex = candidate.length;
    for (const token of ADDRESS_STOP_TOKENS) {
      const idx = lower.indexOf(token);
      if (idx >= 0) endIndex = Math.min(endIndex, idx);
    }
    return cleanupAddress(candidate.slice(0, endIndex).trim());
  }

  const streetRegex = new RegExp(
    `(\\d{1,4}[A-Za-z]?\\s+[A-Za-z0-9.'-]+(?:\\s+[A-Za-z0-9.'-]+){0,6}\\s+${STREET_TYPES}(?:,?\\s+[A-Za-z][A-Za-z\\s'-]+){0,2})`,
    "i"
  );
  const matched = cleaned.match(streetRegex)?.[1] || cleaned.match(streetRegex)?.[0];
  return matched ? cleanupAddress(matched) : "";
}

export function parseRequirement(text) {
  const lower = text.toLowerCase();
  const items = [];
  if (lower.includes("shutter")) items.push("Shutters");
  if (lower.includes("roller")) items.push("Roller blinds");
  if (lower.includes("repair")) items.push("Repair");
  if (lower.includes("install")) items.push("Installation");
  if (lower.includes("quote")) items.push("Quote request");
  if (lower.includes("blind")) items.push("Blinds");
  return [...new Set(items)].join(", ");
}

export function smartFill(text) {
  if (!text || typeof text !== "string") {
    return { name: "", phone: "", email: "", address: "", requirement: "", notes: "" };
  }
  const cleaned = preprocessText(text);
  return {
    name: parseName(cleaned) || "",
    phone: parsePhone(cleaned) || "",
    email: parseEmail(cleaned) || "",
    address: parseAddress(cleaned) || "",
    requirement: parseRequirement(cleaned) || "",
    notes: cleaned,
  };
}

export function runSelfTests() {
  const sample = "Tom phone 021 123 4567 email tom@test.com address 13 Preston Avenue, Mount Albert, Auckland wants living room shutters.";
  return parseName(sample) === "Tom" && parsePhone(sample) === "0211234567";
}

export function mapContactRow(item) {
  return {
    id: item.id,
    name: item.name || "Unnamed Contact",
    phone: item.phone || "",
    email: item.email || "",
    address: item.address || "",
    requirement: item.requirement || "",
    notes: item.notes || "",
    status: item.status || "New",
    tags: Array.isArray(item.tags) ? item.tags : [],
    touchpoints: 1,
    meetings: 0,
    lastContact: item.created_at ? new Date(item.created_at).toLocaleString() : "Just now",
    created_at: item.created_at || null,
  };
}
