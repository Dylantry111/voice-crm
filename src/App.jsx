import React, { useEffect, useMemo, useState } from "react";
import {
  Mic,
  Search,
  Phone,
  MessageCircle,
  CalendarDays,
  ChevronRight,
  Download,
  Mail,
  User,
  MapPin,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Filter,
  Briefcase,
  Save,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const STATUS_OPTIONS = [
  { name: "New", color: "bg-slate-100 text-slate-700" },
  { name: "Contacted", color: "bg-blue-100 text-blue-700" },
  { name: "Measured", color: "bg-amber-100 text-amber-700" },
  { name: "Quoted", color: "bg-purple-100 text-purple-700" },
  { name: "Closed", color: "bg-emerald-100 text-emerald-700" },
];

const TAG_OPTIONS = [
  { name: "VIP", color: "bg-rose-100 text-rose-700" },
  { name: "Hot", color: "bg-orange-100 text-orange-700" },
  { name: "High Budget", color: "bg-violet-100 text-violet-700" },
  { name: "Repeat", color: "bg-sky-100 text-sky-700" },
];

const EVENT_TYPES = [
  { name: "Measure", minutes: 60, color: "bg-slate-900 text-white" },
  { name: "Quote", minutes: 30, color: "bg-blue-600 text-white" },
  { name: "Repair", minutes: 60, color: "bg-amber-500 text-white" },
  { name: "Installation", minutes: 120, color: "bg-emerald-600 text-white" },
];

const SAMPLE_TIMELINE = [
  {
    type: "created",
    title: "Lead created from voice capture",
    time: "Today · 10:12 AM",
  },
  {
    type: "call",
    title: "Called customer",
    time: "Today · 10:18 AM",
  },
  {
    type: "booking",
    title: "Booking scheduled · Measure",
    time: "Tomorrow · 2:00 PM",
  },
];

const DEMO_CONTACTS = [
  {
    id: "demo-c1",
    name: "John Smith",
    phone: "0211234567",
    address: "13 Preston Avenue, Mount Albert, Auckland",
    requirement: "Living room shutters and bedroom roller blinds",
    notes:
      "Met at the expo. Wants a quick measure first. Mentioned concern about afternoon glare in the living room and blackout needs for one bedroom.",
    status: "Quoted",
    tags: ["VIP", "High Budget"],
    touchpoints: 7,
    meetings: 2,
    lastContact: "2 days ago",
    nextBooking: "Tomorrow · 2:00 PM · Measure",
    timeline: SAMPLE_TIMELINE,
  },
  {
    id: "demo-c2",
    name: "Amy Chen",
    phone: "0229876543",
    address: "25 Dominion Road, Mt Eden, Auckland",
    requirement: "Kitchen sunscreen blinds",
    notes: "Asked about quick turnaround and easy-clean fabric.",
    status: "Measured",
    tags: ["Hot"],
    touchpoints: 4,
    meetings: 1,
    lastContact: "Today",
    nextBooking: "Friday · 10:30 AM · Quote",
    timeline: SAMPLE_TIMELINE,
  },
];

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

function titleCase(value) {
  return (value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizePhone(value) {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("64")) return `0${digits.slice(2)}`;
  return digits;
}

function parseName(text) {
  const explicit = text.match(
    /(?:my name is|name is|i'm|i am|this is|customer is|客户姓名|姓名)\s+([A-Za-z][A-Za-z\s'-]{1,40}|[\u4e00-\u9fa5·]{2,12})/i
  );
  if (explicit?.[1]) return titleCase(explicit[1].trim());

  const phoneIndex = text.search(/(?:\+?64|0)[\d\s()-]{7,20}/);
  const head = text.slice(0, phoneIndex >= 0 ? phoneIndex : Math.min(text.length, 60));

  const parts = head
    .split(/[,.\n，]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const p of parts.slice(0, 3)) {
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(p)) return p.trim();
    if (/^[\u4e00-\u9fa5·]{2,12}$/.test(p)) return p;
  }

  const leadingWords = head
    .replace(/^(phone|mobile|address|need|looking|notes)\b/gi, "")
    .trim()
    .match(/^[A-Za-z'\-]+(?:\s+[A-Za-z'\-]+){1,2}/);

  if (leadingWords?.[0]) {
    const candidate = leadingWords[0].trim();
    if (!/\b(phone|mobile|address|need|looking|quote|measure)\b/i.test(candidate)) {
      return titleCase(candidate);
    }
  }

  const capitalizedPair = head.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
  if (capitalizedPair?.[1]) return capitalizedPair[1].trim();

  return "";
}

function parsePhone(text) {
  const explicit = text.match(
    /(?:phone|mobile|tel|number|电话|手机号)\s*(?:is|是|:)?\s*([+\d\s()-]{8,20})/i
  );
  if (explicit?.[1]) return normalizePhone(explicit[1]);
  const all = text.match(/(?:\+?64|0)[\d\s()-]{7,20}/g);
  return all?.length ? normalizePhone(all[0]) : "";
}

function cleanupAddress(value) {
  return (value || "")
    .replace(/\bmt\b/gi, "Mount")
    .replace(/\brd\b/gi, "Road")
    .replace(/\bave\b/gi, "Avenue")
    .replace(/\bst\b/gi, "Street")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseAddress(text) {
  const patterns = [
    /(?:address|住址|地址)\s*(?:is|是|:)?\s*([^\n,，]+?(?:\s+[^\n,，]+?){0,10}?)(?=\s+(?:phone|mobile|tel|number|need|needs|looking|wants|want|quote|measure|measuring|install|installation|repair|notes|note|requirement|customer|客户|预算|明天|tomorrow|下周|next)\b|[,.，。]|$)/i,
    /(\d{1,4}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,6}\s+(?:Road|Street|Avenue|Drive|Lane|Place|Court|Terrace|Way|Close|Rd|St|Ave|Dr|Ln|Pl|Ct|Tce)(?:\s+[A-Za-z][A-Za-z'-]+){0,3})/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      return cleanupAddress(
        m[1]
          .replace(/[,.，。;；]+$/g, "")
          .replace(/\s{2,}/g, " ")
          .trim()
      );
    }
  }

  return "";
}

function parseRequirement(text) {
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

function smartFill(text) {
  return {
    name: parseName(text),
    phone: parsePhone(text),
    address: parseAddress(text),
    requirement: parseRequirement(text),
    notes: text.trim(),
  };
}

function runSelfTests() {
  const cases = [
    {
      name: "parses phone",
      actual: parsePhone("John phone 021 123 4567"),
      expected: "0211234567",
    },
    {
      name: "parses address",
      actual: parseAddress("address 13 Preston Avenue Mount Albert"),
      expected: "13 Preston Avenue Mount Albert",
    },
    {
      name: "smart fill keeps note",
      actual: smartFill("hello world").notes,
      expected: "hello world",
    },
    {
      name: "parseName split regex is valid",
      actual: parseName("John Smith, phone 0211234567"),
      expected: "John Smith",
    },
    {
      name: "parseName prefers actual leading name",
      actual: parseName(
        "John Smith phone 021 123 4567 address 13 Preston Avenue Mount Albert wants living room shutters and one bedroom roller blinds"
      ),
      expected: "John Smith",
    },
    {
    name: "parseAddress stops before requirement text",
    actual: parseAddress(
    "John Smith phone 021 123 4567 address 13 Preston Avenue Mount Albert wants living room shutters and one bedroom roller blinds"
    ),
    expected: "13 Preston Avenue Mount Albert",
    },
  ];

  return cases.every((test) => test.actual === test.expected);
}

function mapContactRow(item) {
  return {
    id: item.id,
    name: item.name || "Unnamed Contact",
    phone: item.phone || "",
    address: item.address || "",
    requirement: item.requirement || "",
    notes: item.notes || "",
    status: item.status || "New",
    tags: [],
    touchpoints: 1,
    meetings: 0,
    lastContact: item.created_at ? new Date(item.created_at).toLocaleString() : "Just now",
    nextBooking: "Not booked",
    timeline: [
      {
        type: "created",
        title: "Lead created",
        time: item.created_at ? new Date(item.created_at).toLocaleString() : "Just now",
      },
    ],
  };
}

function EventBadge({ type }) {
  const item = EVENT_TYPES.find((e) => e.name === type) || EVENT_TYPES[0];
  return (
    <span className={classNames("rounded-full px-2.5 py-1 text-xs font-medium", item.color)}>
      {item.name}
    </span>
  );
}

function StatusBadge({ value }) {
  const item = STATUS_OPTIONS.find((s) => s.name === value) || STATUS_OPTIONS[0];
  return (
    <span className={classNames("rounded-full px-2.5 py-1 text-xs font-medium", item.color)}>
      {item.name}
    </span>
  );
}

function TagChip({ value }) {
  const item = TAG_OPTIONS.find((t) => t.name === value) || {
    color: "bg-slate-100 text-slate-700",
    name: value,
  };
  return (
    <span className={classNames("rounded-full px-2.5 py-1 text-xs font-medium", item.color)}>
      {item.name}
    </span>
  );
}

function ContactCard({ contact, onOpen }) {
  return (
    <button
      onClick={() => onOpen(contact)}
      className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{contact.name}</div>
          <div className="mt-1 text-sm text-slate-500">{contact.phone}</div>
        </div>
        <StatusBadge value={contact.status} />
      </div>
      <div className="mt-3 line-clamp-2 text-sm text-slate-600">{contact.address}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {contact.tags.map((t) => (
          <TagChip key={t} value={t} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
        <div>
          <div className="text-xs text-slate-500">Touch</div>
          <div className="text-sm font-semibold">{contact.touchpoints}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Meet</div>
          <div className="text-sm font-semibold">{contact.meetings}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Next</div>
          <div className="line-clamp-2 text-xs font-semibold">{contact.nextBooking}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Open contact workspace</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

function DayTimeline({ selectedEventType, onPickSlot }) {
  const slots = [
    { time: "08:00 - 09:00", booked: false },
    { time: "09:00 - 10:00", booked: true, who: "John Smith", where: "Mount Albert" },
    { time: "10:00 - 11:00", booked: false },
    { time: "11:00 - 12:00", booked: true, who: "Amy Chen", where: "Mt Eden" },
    { time: "12:00 - 1:00", booked: false },
    { time: "2:00 - 3:00", booked: false },
    { time: "3:00 - 4:00", booked: true, who: "Sarah Patel", where: "Te Atatu" },
    { time: "4:00 - 5:00", booked: false },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Tomorrow · Fri 18 Apr</div>
          <div className="text-xs text-slate-500">
            Select a start time. Duration follows the event type automatically.
          </div>
        </div>
        <EventBadge type={selectedEventType.name} />
      </div>
      <div className="mt-4 space-y-2">
        {slots.map((slot) =>
          slot.booked ? (
            <div
              key={slot.time}
              className="grid grid-cols-[110px_1fr] gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3"
            >
              <div className="text-sm font-medium text-slate-700">{slot.time}</div>
              <div>
                <div className="text-sm font-semibold text-amber-800">Booked · {slot.who}</div>
                <div className="text-xs text-amber-700">{slot.where}</div>
              </div>
            </div>
          ) : (
            <button
              key={slot.time}
              onClick={() => onPickSlot(slot.time)}
              className="grid w-full grid-cols-[110px_1fr] gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-700">{slot.time}</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Available</div>
                <div className="text-xs text-slate-500">Tap to use this slot</div>
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("capture");
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState("");
  const [voiceInput, setVoiceInput] = useState(
    "John Smith phone 021 123 4567 address 13 Preston Avenue Mount Albert wants living room shutters and one bedroom roller blinds. Needs a measure next week."
  );
  const [draft, setDraft] = useState(() =>
    smartFill(
      "John Smith phone 021 123 4567 address 13 Preston Avenue Mount Albert wants living room shutters and one bedroom roller blinds. Needs a measure next week."
    )
  );
  const [selectedContact, setSelectedContact] = useState(DEMO_CONTACTS[0]);
  const [selectedEventType, setSelectedEventType] = useState(EVENT_TYPES[0]);
  const [selectedSlot, setSelectedSlot] = useState("Tomorrow · 2:00 - 3:00");
  const [showExporter] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoadingContacts(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setContacts([]);
      setLoadingContacts(false);
      return;
    }

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("加载 contacts 失败:", error.message);
      setContacts([]);
      setLoadingContacts(false);
      return;
    }

    const mapped = (data || []).map(mapContactRow);
    setContacts(mapped);
    if (mapped.length > 0) {
      setSelectedContact(mapped[0]);
    }
    setLoadingContacts(false);
  }

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.phone, c.address, c.requirement, c.status, ...(c.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [contacts, query]);
  function openContact(contact) {
  setSelectedContact(contact);
  setView("detail");
  }
  function handleFill() {
    setDraft(smartFill(voiceInput));
  }

  async function handleSaveLead() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("请先登录");
    return;
  }

  const payload = {
    user_id: user.id,
    name: draft.name || "New Contact",
    phone: draft.phone || "",
    address: draft.address || "",
    requirement: draft.requirement || "General enquiry",
    notes: draft.notes || voiceInput,
    status: "New",
  };

  // 1. 先保存 contact
  const { data: contactRow, error: contactError } = await supabase
    .from("contacts")
    .insert([payload])
    .select()
    .single();

  if (contactError) {
    console.error("保存 contact 失败:", contactError.message);
    alert(`保存 contact 失败: ${contactError.message}`);
    return;
  }

  // 2. 如果当前有选中的预约时间，就顺便保存 booking
  if (selectedSlot) {
    const slotMatch = selectedSlot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);

    if (slotMatch) {
      const [, startH, startM, endH, endM] = slotMatch;

      // 这里先固定用明天作为预约日期（与你当前原型一致）
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 1);

      const startTime = new Date(bookingDate);
      startTime.setHours(Number(startH), Number(startM), 0, 0);

      const endTime = new Date(bookingDate);
      endTime.setHours(Number(endH), Number(endM), 0, 0);

      const bookingPayload = {
        user_id: user.id,
        contact_id: contactRow.id,
        event_type: selectedEventType.name,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };

      const { error: bookingError } = await supabase
        .from("bookings")
        .insert([bookingPayload]);

      if (bookingError) {
        console.error("保存 booking 失败:", bookingError.message);
        alert(`客户已保存，但预约保存失败: ${bookingError.message}`);
      }
    }
  }

  const newContact = {
    ...mapContactRow(contactRow),
    tags: ["Hot"],
    touchpoints: 1,
    meetings: 0,
    lastContact: "Just now",
    nextBooking: selectedSlot
      ? `${selectedSlot} · ${selectedEventType.name}`
      : "Not booked",
    timeline: [
      {
        type: "created",
        title: "Lead created from voice capture",
        time: contactRow.created_at
          ? new Date(contactRow.created_at).toLocaleString()
          : "Just now",
      },
      ...(selectedSlot
        ? [
            {
              type: "booking",
              title: `Booking scheduled · ${selectedEventType.name}`,
              time: selectedSlot,
            },
          ]
        : []),
    ],
  };

  setContacts((prev) => [newContact, ...prev]);
  setSelectedContact(newContact);
  setView("detail");
}

  const testsPass = runSelfTests();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600">
                <Briefcase className="h-3.5 w-3.5" />
                One phone. Separate work from life.
              </div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">
                Voice-first Client Workspace
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Capture clients fast, keep full notes, contact instantly, and manage bookings
                without using your personal contacts.
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium">
                Sync Calendar
              </button>
              <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Upgrade Pro
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6">
          <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
            <nav className="space-y-2">
              {[
                ["capture", "Capture", Mic],
                ["contacts", "Contacts", User],
                ["calendar", "Calendar", CalendarDays],
                ["export", "Export", Download],
              ].map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={classNames(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                    view === key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-6 rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Core value
              </div>
              <div className="mt-2 text-sm text-slate-700">
                Replace scattered notes, personal contacts, and manual follow-up with one
                client workspace.
              </div>
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200 p-4 text-xs text-slate-500">
              Self-tests{" "}
              <span className={testsPass ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                {testsPass ? "passing" : "failing"}
              </span>
            </div>
          </aside>

          <main className="space-y-6">
            {view === "capture" && (
              <>
                <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">1. Capture by voice</div>
                        <div className="text-sm text-slate-500">
                          Speak once, then let the system structure the customer record while
                          still keeping the full note.
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Demo flow
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-slate-200 p-4">
                      <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <Mic className="h-3.5 w-3.5" />
                        Voice transcript
                      </label>
                      <textarea
                        value={voiceInput}
                        onChange={(e) => setVoiceInput(e.target.value)}
                        className="min-h-[150px] w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-slate-400"
                      />
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={handleFill}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                        >
                          <Sparkles className="h-4 w-4" />
                          Fill structured record
                        </button>
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Full original note is always kept
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="text-lg font-semibold">2. Structured record</div>
                    <div className="mt-1 text-sm text-slate-500">
                      This is the real value: one input creates a searchable work contact,
                      complete notes, and a follow-up-ready record.
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Name
                        </label>
                        <input
                          value={draft.name}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Phone
                        </label>
                        <input
                          value={draft.phone}
                          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                          className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Address
                        </label>
                        <input
                          value={draft.address}
                          onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                          className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Requirement
                        </label>
                        <input
                          value={draft.requirement}
                          onChange={(e) => setDraft({ ...draft, requirement: e.target.value })}
                          className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Notes
                        </label>
                        <textarea
                          value={draft.notes}
                          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                          className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="text-lg font-semibold">3. Booking with event type</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Choose a job type. The system knows the default duration and lets you
                      place the booking fast.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {EVENT_TYPES.map((e) => (
                        <button
                          key={e.name}
                          onClick={() => setSelectedEventType(e)}
                          className={classNames(
                            "rounded-2xl px-3 py-2 text-sm font-medium",
                            selectedEventType.name === e.name
                              ? e.color
                              : "border border-slate-200 bg-white text-slate-700"
                          )}
                        >
                          {e.name} · {e.minutes}m
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-medium">Selected slot</div>
                      <div className="mt-2 text-sm text-slate-600">
                        {selectedSlot} · {selectedEventType.name}
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={handleSaveLead}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                        >
                          <Save className="h-4 w-4" />
                          Save contact + workflow
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium">
                          <CalendarDays className="h-4 w-4" />
                          Sync calendar
                        </button>
                      </div>
                    </div>
                  </div>

                  <DayTimeline
                    selectedEventType={selectedEventType}
                    onPickSlot={(slot) => setSelectedSlot(`Tomorrow · ${slot}`)}
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-3">
                  {[
                    {
                      title: "One input, complete record",
                      body: "Voice becomes structured data plus full notes, so no details are lost.",
                    },
                    {
                      title: "No second phone needed",
                      body: "Keep personal contacts clean. Run client work inside a separate workspace.",
                    },
                    {
                      title: "Act, not just store",
                      body: "Open any customer and call, message, book, or export immediately.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-lg font-semibold">{item.title}</div>
                      <div className="mt-2 text-sm text-slate-600">{item.body}</div>
                    </div>
                  ))}
                </section>
              </>
            )}

            {view === "contacts" && (
              <>
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-lg font-semibold">Contacts workspace</div>
                      <div className="mt-1 text-sm text-slate-500">
                        This is the work contact layer that replaces your need to store every
                        client in your personal phonebook.
                      </div>
                    </div>
                    <div className="relative w-full md:max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search name, phone, address, tags..."
                        className="h-12 w-full rounded-2xl border border-slate-200 pl-10 pr-4 text-sm outline-none"
                      />
                    </div>
                  </div>
                </section>

                {loadingContacts ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    Loading contacts...
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No contacts yet. Create your first one from the Capture page.
                  </div>
                ) : (
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredContacts.map((contact) => (
                      <ContactCard key={contact.id} contact={contact} onOpen={openContact} />
                    ))}
                  </section>
                )}
              </>
            )}

            {view === "detail" && selectedContact && (
  <>
    <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <button
        onClick={() => setView("contacts")}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to contacts
      </button>

      <div className="flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
          <Phone className="h-4 w-4" />
          Call
        </button>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium">
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium">
          <CalendarDays className="h-4 w-4" />
          Add booking
        </button>
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="m-0 text-2xl font-semibold text-slate-900">
              {selectedContact.name}
            </h2>
            <StatusBadge value={selectedContact.status} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedContact.tags?.map((tag) => (
              <TagChip key={tag} value={tag} />
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {selectedContact.phone || "Not provided"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Address
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {selectedContact.address || "Not provided"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:w-[360px] xl:grid-cols-1">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Next booking
            </div>
            <div className="mt-2 text-sm font-semibold text-emerald-900">
              {selectedContact.nextBooking || "Not booked"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Last contact
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {selectedContact.lastContact || "Just now"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Activity
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {selectedContact.touchpoints || 0} touchpoints ·{" "}
              {selectedContact.meetings || 0} meetings
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">Next action</div>
              <div className="mt-1 text-sm text-slate-500">
                Keep the next step obvious so testing feels like using a real tool.
              </div>
            </div>
            <Filter className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-4 space-y-3">
            <button className="flex w-full items-start justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Confirm next booking
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Use this when a measure or quote is already scheduled
                </div>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 text-slate-400" />
            </button>

            <button className="flex w-full items-start justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Add follow-up note
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Record objections, site details, or product preferences
                </div>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 text-slate-400" />
            </button>

            <button className="flex w-full items-start justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Create or reschedule booking
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Useful when the customer changes availability
                </div>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Requirement</div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {selectedContact.requirement || "No requirement recorded yet."}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Client snapshot</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Touchpoints
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {selectedContact.touchpoints || 0}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Meetings
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {selectedContact.meetings || 0}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Status
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {selectedContact.status || "New"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">Notes</div>
              <div className="mt-1 text-sm text-slate-500">
                Full customer notes should stay visible and easy to scan.
              </div>
            </div>
            <button className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              Add note
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {selectedContact.notes || "No notes recorded yet."}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">Timeline</div>
              <div className="mt-1 text-sm text-slate-500">
                A simple activity log is more useful than a dense CRM audit trail at this stage.
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {selectedContact.timeline?.length ? (
              selectedContact.timeline.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No timeline yet.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  </>
)}

            {view === "calendar" && (
              <section className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">Calendar workflow</div>
                      <div className="mt-1 text-sm text-slate-500">
                        One day per page. Start time only. Event type decides duration. Clear
                        enough for fast mobile use.
                      </div>
                    </div>
                    <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                      Connect Google Calendar
                    </button>
                  </div>
                </section>
                <DayTimeline
                  selectedEventType={selectedEventType}
                  onPickSlot={(slot) => setSelectedSlot(`Tomorrow · ${slot}`)}
                />
              </section>
            )}

            {view === "export" && (
              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-lg font-semibold">Export and email</div>
                  <div className="mt-2 text-sm text-slate-500">
                    A strong trust feature: users can always take their client database with
                    them.
                  </div>
                  <div className="mt-6 space-y-3">
                    <button className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-300">
                      <div className="flex items-center gap-3">
                        <Download className="h-5 w-5 text-slate-500" />
                        <div>
                          <div className="text-sm font-semibold">Export CSV</div>
                          <div className="text-xs text-slate-500">For spreadsheet or CRM import</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                    <button className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-300">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-slate-500" />
                        <div>
                          <div className="text-sm font-semibold">Email to myself</div>
                          <div className="text-xs text-slate-500">Quick backup and handoff</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                    <button className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-300">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-slate-500" />
                        <div>
                          <div className="text-sm font-semibold">Export contacts card (.vcf)</div>
                          <div className="text-xs text-slate-500">Optional handoff to phone contacts</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-lg font-semibold">What makes this sellable</div>
                  <div className="mt-4 space-y-4 text-sm text-slate-600">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">
                        1. Faster than notes + contacts + calendar
                      </div>
                      <div className="mt-1">One input replaces three separate tools.</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">2. Better than phone contacts</div>
                      <div className="mt-1">
                        Each client record includes notes, status, tags, touchpoints, meetings,
                        and bookings.
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="font-semibold text-slate-900">3. Clean work / life separation</div>
                      <div className="mt-1">
                        Users keep personal contacts private while still calling and messaging
                        clients instantly.
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {showExporter && <div />}
    </div>
  );
}
