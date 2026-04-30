function extract(regex, text) {
  const match = text.match(regex);
  return match ? (match[1] || match[0]).trim() : "";
}

function normalizePhone(phone = "") {
  return phone.replace(/[^\d+]/g, "");
}

const INVALID_NAME_TOKENS = new Set([
  "电话",
  "手机",
  "手机号",
  "联系电话",
  "地址",
  "住址",
  "住在",
  "邮箱",
  "邮件",
  "需求",
  "备注",
  "客户",
]);

function cleanName(value = "") {
  const name = value.trim().replace(/[，。,;；:：]+$/g, "");
  if (!name || INVALID_NAME_TOKENS.has(name)) return "";
  return name;
}

function extractChineseName(text = "") {
  const labeled = extract(/(?:姓名|名字|联系人|客户)[:：\s]*([\u4e00-\u9fa5]{2,4})/i, text);
  if (cleanName(labeled)) return cleanName(labeled);

  const match = text.match(/(?:^|[，,。\s])([\u4e00-\u9fa5]{2,4})(?:[，,。\s]|电话|手机号|联系电话|地址|住在|住址|邮箱|邮件|想约|需要|$)/);
  return cleanName(match ? match[1] : "");
}

function extractEnglishName(text = "") {
  const labeled = extract(/(?:name|customer|contact)[:：\s]*([A-Za-z][A-Za-z' -]{1,40})/i, text);
  if (cleanName(labeled)) return cleanName(labeled);

  const leading = extract(/^([A-Za-z][A-Za-z' -]{1,40}?)(?:[，,]|\s+(?:phone|mobile|email|address|wants|needs)|$)/i, text);
  if (cleanName(leading)) return cleanName(leading);

  return cleanName(text.split(/[，,\s]+/)[0] || "");
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
  const cases = [
    {
      input: "Olivia Thompson，电话 021 483 927，邮箱 olivia.thompson.nz@gmail.com，地址 14 Kauri Street, Mount Eden, Auckland 1024, New Zealand。",
      expectedName: "Olivia Thompson",
    },
    {
      input: "手机号 022 615 3849，邮箱 ethan.wilson.akl@outlook.com，地址 88 Dominion Road, Balmoral, Auckland 1041, New Zealand。",
      expectedName: "",
    },
    {
      input: "联系人：张三，电话 0212345678，地址 Auckland",
      expectedName: "张三",
    },
  ];

  return cases.every(({ input, expectedName }) => smartFill(input).name === expectedName);
}
