export function findDuplicateContacts(draft, contacts = []) {
  const phone = (draft?.phone || "").replace(/\D+/g, "");
  const email = (draft?.email || "").trim().toLowerCase();
  const name = (draft?.name || "").trim().toLowerCase();

  const matches = contacts
    .filter((contact) => {
      const cPhone = (contact.phone || "").replace(/\D+/g, "");
      const cEmail = (contact.email || "").trim().toLowerCase();
      const cName = (contact.name || "").trim().toLowerCase();
      return (phone && cPhone && phone === cPhone) || (email && cEmail && email === cEmail) || (name && cName && name === cName);
    })
    .map((contact) => ({ contact }));

  return {
    hasDuplicate: matches.length > 0,
    matches,
  };
}

export function buildDuplicateMessage(result) {
  if (!result?.matches?.length) return "";
  return `发现疑似重复联系人：${result.matches.map((item) => item.contact.name).join("，")}。是否继续创建？`;
}
