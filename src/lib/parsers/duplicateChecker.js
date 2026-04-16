import { normalizeAddress, normalizeEmail, normalizePhone } from "./contactParser";

export function findDuplicateContacts(draft, contacts) {
  const phone = normalizePhone(draft.phone);
  const email = normalizeEmail(draft.email);
  const address = normalizeAddress(draft.address);

  const matches = contacts
    .map((contact) => {
      const reasons = [];
      if (phone && normalizePhone(contact.phone) === phone) reasons.push("phone");
      if (email && normalizeEmail(contact.email) === email) reasons.push("email");
      if (address && normalizeAddress(contact.address) === address) reasons.push("address");
      return reasons.length ? { contact, reasons } : null;
    })
    .filter(Boolean);

  return { hasDuplicate: matches.length > 0, matches };
}

export function buildDuplicateMessage(result) {
  if (!result?.matches?.length) return "";
  const lines = result.matches.map(({ contact, reasons }, idx) =>
    `${idx + 1}. ${contact.name || "Unnamed Contact"} — same ${reasons.join(", ")}`
  );
  return `Possible duplicate contact found:\n\n${lines.join("\n")}\n\nPress OK to continue, or Cancel to open the first matching contact.`;
}
