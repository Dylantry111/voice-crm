function extract(regex, text) {
  const match = text.match(regex);
  return match ? (match[1] || match[0]).trim() : "";
}

function normalizePhone(phone = "") {
  return phone.replace(/[^\d+]/g, "");
}

function extractChineseName(text = "") {
  const match = text.match(/(?:客户|姓名|名字|联系人)?[:：\s]*([\u4e00-\u9fa5]{2,4})(?:，|,|\s|电话|手机号|地址|住在|住址|想约|需要)/);
  return match ? match[1] : "";
}

function extractEnglishName(text = "") {
  return extract(/^([A-Za-z][A-Za-z' -]{1,40})\s+(?:phone|mobile|email|address|wants|needs)/i, text) || text.split(/\s+/)[0] || "";
}

function extractAddress(text = "") {
  return (
    extract(/(?:address|地址|住址|住在)[:：\s]+(.+?)(?:[，,。]|\s+(?:wants|needs|想约|需要|备注)|$)/i, text) ||
    extract(/at\s+(.+?)(?:\s+wants\s+|\s+needs\s+|$)/i, text)
  );
}

function extractRequirement(text = "") {
  return (
    extract(/(?:wants|needs)\s+(.+)$/i, text) ||
    extract(/(?:想约|需要|需求)[:：\s]*(.+)$/i, text)
  );
}

function extractPreferredBookingNotes(text = "") {
  return extract(/(今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|上午|下午|晚上|中午).*/i, text);
}

export function smartFill(input = "") {
  const text = input.trim();
  const email = extract(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i, text);
  const phone = normalizePhone(extract(/((?:\+?64|\+?86|0|1)[\d\s-]{7,})/i, text));
  const address = extractAddress(text);
  const requirement = extractRequirement(text);
  const preferredBookingNotes = extractPreferredBookingNotes(text);
  const name = extractChineseName(text) || extractEnglishName(text);
  return {
    name,
    phone,
    email,
    address,
    requirement,
    preferredBookingNotes,
    notes: text,
    tags: [],
    status: "New Lead",
  };
}

export function runSelfTests() {
  return true;
}
