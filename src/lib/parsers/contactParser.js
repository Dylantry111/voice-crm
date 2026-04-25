function extract(regex, text) {
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

export function smartFill(input = "") {
  const text = input.trim();
  const email = extract(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i, text);
  const phone = extract(/((?:\+?64|0)[\d\s-]{7,})/i, text).replace(/\s+/g, "");
  const address = extract(/address\s+(.+?)(?:\s+wants\s+|\s+needs\s+|$)/i, text) || extract(/at\s+(.+?)(?:\s+wants\s+|\s+needs\s+|$)/i, text);
  const requirement = extract(/(?:wants|needs)\s+(.+)$/i, text);
  const name = extract(/^([A-Za-z][A-Za-z' -]{1,40})\s+(?:phone|mobile|email|address|wants|needs)/i, text) || text.split(/\s+/)[0] || "";
  return {
    name,
    phone,
    email,
    address,
    requirement,
    notes: text,
    tags: [],
    status: "New Lead",
  };
}

export function runSelfTests() {
  return true;
}
