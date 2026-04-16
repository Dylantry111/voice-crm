export function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

export function titleCase(value) {
  return (value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function parseName(text) {
  const explicit = text.match(
    /(?:my name is|name is|i'm|i am|this is|customer is|客户姓名|姓名)\s+([A-Za-z][A-Za-z\s'-]{1,40}|[\u4e00-\u9fa5·]{2,12})/i
  );
  if (explicit?.[1]) return titleCase(explicit[1].trim());

  const phoneIndex = text.search(/(?:\+?64|0)[\d\s()-]{7,20}/);
  const head = text.slice(0, phoneIndex >= 0 ? phoneIndex : Math.min(text.length, 60));

  const parts = head
    .split(/[,\.\n，]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const p of parts.slice(0, 3)) {
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(p)) return p.trim();
    if (/^[\u4e00-\u9fa5·]{2,12}$/.test(p)) return p;
  }

  const capitalizedPair = head.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
  if (capitalizedPair?.[1]) return capitalizedPair[1].trim();

  return "";
}

export function parsePhone(text) {
  const match = text.match(
    /(?:phone|mobile|tel|number|电话|手机号)?\s*(?:is|是|:)?\s*((?:\+?64|0)[\d\s()-]{7,20})(?=\s|$|\n|\.|,)/i
  );
  if (!match) return "";
  let digits = match[1].replace(/\D/g, "");
  if (digits.startsWith("64")) digits = "0" + digits.slice(2);
  if (digits.length < 9 || digits.length > 11) return digits.slice(0, 11);
  return digits;
}

export function cleanupAddress(value) {
  return (value || "")
    .replace(/\bmt\b/gi, "Mount")
    .replace(/\brd\b/gi, "Road")
    .replace(/\bave\b/gi, "Avenue")
    .replace(/\bst\b/gi, "Street")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseAddress(text) {
  const patterns = [
    /(?:address|住址|地址)\s*(?:is|是|:)?\s*([^\n]+?)(?=\n|(?:\d+\.)|$)/i,
    /(\d{1,4}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,8}\s+(?:Road|Street|Avenue|Drive|Lane|Place|Court|Terrace|Way|Close))/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      return cleanupAddress(m[1].replace(/[。.;；]+$/g, "").trim());
    }
  }
  return "";
}

export function splitAddress(fullAddress) {
  const result = { streetNumber: "", streetName: "", suburb: "", city: "" };
  if (!fullAddress) return result;

  const parts = fullAddress
    .replace(/\s{2,}/g, " ")
    .replace(/[，]/g, ",")
    .trim()
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts[0]) {
    const streetMatch = parts[0].match(/^(\d+[A-Za-z]?)\s+(.+)$/);
    if (streetMatch) {
      result.streetNumber = streetMatch[1].trim();
      result.streetName = streetMatch[2].trim();
    } else {
      result.streetName = parts[0];
    }
  }
  if (parts.length === 2) result.suburb = parts[1] || "";
  if (parts.length >= 3) {
    result.suburb = parts[1] || "";
    result.city = parts[2] || "";
  }
  return result;
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
    return {
      name: "",
      phone: "",
      address: "",
      streetNumber: "",
      streetName: "",
      suburb: "",
      city: "",
      requirement: "",
      notes: "",
    };
  }

  const cleanedText = text.replace(/\r/g, "").replace(/\s{2,}/g, " ").trim();
  const name = parseName(cleanedText);
  const phone = parsePhone(cleanedText);
  const requirement = parseRequirement(cleanedText);
  const fullAddress = parseAddress(cleanedText) || "";
  const addressParts = splitAddress(fullAddress) || {};

  return {
    name: name || "",
    phone: phone || "",
    address: fullAddress,
    streetNumber: addressParts.streetNumber || "",
    streetName: addressParts.streetName || "",
    suburb: addressParts.suburb || "",
    city: addressParts.city || "",
    requirement: requirement || "",
    notes: cleanedText,
  };
}

export function runSelfTests() {
  const cases = [
    { actual: parsePhone("John phone 021 123 4567"), expected: "0211234567" },
    { actual: parseAddress("address 13 Preston Avenue Mount Albert"), expected: "13 Preston Avenue Mount Albert" },
    { actual: smartFill("hello world").notes, expected: "hello world" },
    { actual: parseName("John Smith, phone 0211234567"), expected: "John Smith" },
  ];
  return cases.every((test) => test.actual === test.expected);
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
    touchpoints: item.touchpoints || 1,
    meetings: item.meetings || 0,
    lastContact: item.created_at ? new Date(item.created_at).toLocaleString() : "Just now",
    nextBooking: item.nextBooking || "Not booked",
    timeline: item.timeline || [
      {
        type: "created",
        title: "Lead created",
        time: item.created_at ? new Date(item.created_at).toLocaleString() : "Just now",
      },
    ],
  };
}
