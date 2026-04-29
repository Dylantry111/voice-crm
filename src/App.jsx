import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { createContact, fetchContacts, updateContact } from "./services/contactsService";
import {
  checkBookingConflict,
  createBooking,
  deleteBooking,
  fetchBookings,
  updateBooking,
} from "./services/bookingsService";
import { fetchSavedLocations } from "./services/savedLocationsService";
import {
  fetchOrCreateMyIntakeProfile,
  updateMyIntakeProfile,
} from "./services/publicIntakeService";
import { loadSettings, saveSettings } from "./services/settingsService";
import { supabase } from "./lib/supabase";
import { smartFill } from "./lib/parsers/contactParser";
import {
  buildDuplicateMessage,
  findDuplicateContacts,
} from "./lib/parsers/duplicateChecker";
import { ALL_TIME_SLOTS } from "./lib/constants";
import { formatDateInputValue } from "./lib/dateUtils";
import BookingEditor from "./components/bookings/BookingEditor";
import DayTimeline from "./components/bookings/DayTimeline";

const PublicIntakeScreen = lazy(() => import("./pages/PublicIntakeScreen.jsx"));

const ui = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a" },
  section: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  },
  sectionMuted: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  },
  input: {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    background: "#fff",
    color: "#0f172a",
  },
  textarea: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: 12,
    background: "#fff",
    color: "#0f172a",
    resize: "vertical",
  },
  select: {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    background: "#fff",
    color: "#0f172a",
  },
  primaryBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 600,
  },
  secondaryBtn: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 600,
  },
  dangerBtn: {
    background: "#fff",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 600,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
};

const STATUS_OPTIONS = ["New Lead", "Contacted", "Quoted", "Won", "Lost"];

function statusBadgeStyle(status) {
  const map = {
    "New Lead": { background: "#dbeafe", color: "#1d4ed8" },
    Contacted: { background: "#fef3c7", color: "#b45309" },
    Quoted: { background: "#ede9fe", color: "#6d28d9" },
    Won: { background: "#dcfce7", color: "#15803d" },
    Lost: { background: "#fee2e2", color: "#b91c1c" },
  };
  return {
    ...ui.badge,
    ...(map[status] || { background: "#e2e8f0", color: "#334155" }),
  };
}

function Section({ title, children, right, muted = false }) {
  return (
    <section style={muted ? ui.sectionMuted : ui.section}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, letterSpacing: "-0.01em" }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ title, value, hint }) {
  return (
    <div style={{ ...ui.sectionMuted, padding: 16 }}>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>{value}</div>
      {hint ? <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>{hint}</div> : null}
    </div>
  );
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizeSlotValue(slot) {
  if (!slot) return "";
  return slot.includes(" - ") ? slot.split(" - ")[0] : slot;
}

function addMinutesToClock(time = "09:00", minutes = 60) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

function slotOptionsForEvent(minutes = 60) {
  const maxIndex = ALL_TIME_SLOTS.length - Math.max(1, Math.ceil(minutes / 30)) + 1;
  return ALL_TIME_SLOTS.slice(0, Math.max(0, maxIndex));
}

function eventTypesToText(eventTypes = []) {
  return (eventTypes || [])
    .map((item) => `${item.name}|${item.minutes || 60}`)
    .join("\n");
}

function savedLocationsToText(savedLocations = []) {
  return (savedLocations || [])
    .map((item) => `${item.name}|${item.address || ""}`)
    .join("\n");
}

function parseEventTypesInput(value = "") {
  return value
    .split("\n")
    .map((line, index) => {
      const [namePart, minutesPart] = line.split("|").map((item) => item.trim());
      if (!namePart) return null;
      return {
        id: `event-${index + 1}`,
        name: namePart,
        minutes: Number(minutesPart) > 0 ? Number(minutesPart) : 60,
        isActive: true,
      };
    })
    .filter(Boolean);
}

function parseSavedLocationsInput(value = "") {
  return value
    .split("\n")
    .map((line, index) => {
      const [namePart, addressPart] = line.split("|").map((item) => item.trim());
      if (!namePart) return null;
      return {
        id: `location-${index + 1}`,
        name: namePart,
        address: addressPart || "",
        isActive: true,
      };
    })
    .filter(Boolean);
}

function bookingModeTitle(mode) {
  if (mode === "customer-create") return "为联系人安排预约";
  if (mode === "calendar-create") return "从空档创建预约";
  return "编辑预约";
}

export default function App() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const publicToken = pathname.startsWith("/intake/")
    ? pathname.replace("/intake/", "").trim()
    : "";
  const isPublicIntakeMode = Boolean(publicToken);

  const [contacts, setContacts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [intakeProfile, setIntakeProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [voiceInput, setVoiceInput] = useState(
    "王小梅，电话 13800138000，住在龙岗区布吉，周五下午有空，想约上门看看。"
  );
  const [draft, setDraft] = useState(() => smartFill(voiceInput));
  const [intakeDraft, setIntakeDraft] = useState({
    form_title: "",
    intro_text: "",
    is_enabled: true,
  });
  const [settingsDraft, setSettingsDraft] = useState({
    statusOptions: [],
    tagOptions: [],
    eventTypesText: "",
    savedLocationsText: "",
  });
  const [calendarDate, setCalendarDate] = useState(formatDateInputValue(new Date()));
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingModalMode, setBookingModalMode] = useState("customer-create");
  const [editingBookingId, setEditingBookingId] = useState("");
  const [bookingForm, setBookingForm] = useState({
    contact_id: "",
    event_type: "Measure",
    duration_minutes: 60,
    date: formatDateInputValue(new Date()),
    slot: "09:00",
    slotOptions: slotOptionsForEvent(60),
    location_source: "contact_address",
    saved_location_id: "",
    location_name: "Customer Address",
    location_address: "",
    notes: "",
    status: "confirmed",
  });

  useEffect(() => {
    if (!isPublicIntakeMode) loadInitialData();
  }, [isPublicIntakeMode]);

  async function loadInitialData() {
    setLoading(true);
    setMessage("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [contactRows, bookingRows, savedLocationRows, intake, settingsData] =
        await Promise.all([
          fetchContacts(),
          fetchBookings(),
          fetchSavedLocations().catch(() => []),
          fetchOrCreateMyIntakeProfile(),
          loadSettings(),
        ]);

      const mergedSavedLocations =
        savedLocationRows && savedLocationRows.length
          ? savedLocationRows
          : settingsData?.savedLocations || [];

      setContacts(contactRows);
      setBookings(bookingRows);
      setSavedLocations(mergedSavedLocations);
      setIntakeProfile(intake);
      setSettings(settingsData);
      setIntakeDraft({
        form_title: intake?.form_title || "",
        intro_text: intake?.intro_text || "",
        is_enabled: Boolean(intake?.is_enabled),
      });
      setSettingsDraft({
        statusOptions: settingsData?.statusOptions || [],
        tagOptions: settingsData?.tagOptions || [],
        eventTypesText: eventTypesToText(settingsData?.eventTypes || []),
        savedLocationsText: savedLocationsToText(mergedSavedLocations),
      });
      if (!selectedContactId && contactRows[0]?.id) setSelectedContactId(contactRows[0].id);
      if (settingsData?.eventTypes?.[0]?.name) {
        setBookingForm((prev) => ({
          ...prev,
          event_type: settingsData.eventTypes[0].name,
          duration_minutes: settingsData.eventTypes[0].minutes || 60,
          slotOptions: slotOptionsForEvent(settingsData.eventTypes[0].minutes || 60),
        }));
      }
    } catch (error) {
      console.error(error);
      setMessage(`加载失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [
        c.name,
        c.phone,
        c.email,
        c.address,
        c.requirement,
        c.status,
        ...(c.tags || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [contacts, query]);

  const selectedContact = useMemo(
    () => contacts.find((item) => item.id === selectedContactId) || filteredContacts[0] || contacts[0] || null,
    [contacts, filteredContacts, selectedContactId]
  );

  const activeEventTypes = useMemo(() => {
    const items = settings?.eventTypes || [];
    return items.filter((item) => item.isActive !== false);
  }, [settings]);

  const duplicateResult = useMemo(
    () => findDuplicateContacts(draft, contacts),
    [draft, contacts]
  );

  const contactBookings = useMemo(() => {
    if (!selectedContact?.id) return [];
    return bookings
      .filter((item) => item.contact_id === selectedContact.id)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [bookings, selectedContact]);

  function fillFromVoice() {
    setDraft((prev) => ({ ...prev, ...smartFill(voiceInput) }));
  }

  function updateSelectedContactField(field, value) {
    if (!selectedContact) return;
    setContacts((prev) =>
      prev.map((item) => (item.id === selectedContact.id ? { ...item, [field]: value } : item))
    );
  }

  function getEventTypeByName(name) {
    return activeEventTypes.find((item) => item.name === name) || activeEventTypes[0] || null;
  }

  function computeEndTime(slot, minutes) {
    return addMinutesToClock(normalizeSlotValue(slot), minutes || 60);
  }

  function resetBookingForm(contact = null, overrides = {}) {
    const firstEventType = activeEventTypes[0] || { name: "Measure", minutes: 60 };
    const defaultSlot = overrides.slot || "09:00";
    setEditingBookingId("");
    setSelectedBookingId("");
    setSelectedSlot(defaultSlot);
    setBookingForm({
      contact_id: overrides.contact_id ?? contact?.id ?? "",
      event_type: overrides.event_type || firstEventType.name,
      duration_minutes: overrides.duration_minutes || firstEventType.minutes || 60,
      date: overrides.date || calendarDate || formatDateInputValue(new Date()),
      slot: defaultSlot,
      slotOptions: slotOptionsForEvent(overrides.duration_minutes || firstEventType.minutes || 60),
      location_source: overrides.location_source || (contact?.address ? "contact_address" : "manual"),
      saved_location_id: overrides.saved_location_id || "",
      location_name: overrides.location_name || (contact?.address ? "Customer Address" : ""),
      location_address: overrides.location_address || contact?.address || "",
      notes: overrides.notes || contact?.notes || "",
      status: overrides.status || "confirmed",
    });
  }

  function openBookingForContact(contact) {
    const targetDate = calendarDate || formatDateInputValue(new Date());
    setCalendarDate(targetDate);
    resetBookingForm(contact, { date: targetDate, slot: "09:00" });
    setBookingModalMode("customer-create");
    setBookingModalOpen(true);
  }

  function openBookingFromSlot(slot) {
    const normalizedSlot = normalizeSlotValue(slot);
    const targetDate = calendarDate || formatDateInputValue(new Date());
    setSelectedSlot(normalizedSlot);
    resetBookingForm(selectedContact, {
      date: targetDate,
      slot: normalizedSlot,
      location_source: selectedContact?.address ? "contact_address" : "manual",
      location_address: selectedContact?.address || "",
      contact_id: selectedContact?.id || "",
    });
    setBookingModalMode("calendar-create");
    setBookingModalOpen(true);
  }

  function startEditBooking(booking) {
    const eventType = getEventTypeByName(booking.event_type);
    const startDate = new Date(booking.start_time);
    const slot = startDate.toISOString().slice(11, 16);
    const minutes = Math.max(
      30,
      Math.round((new Date(booking.end_time) - new Date(booking.start_time)) / 60000)
    );
    setEditingBookingId(booking.id);
    setSelectedBookingId(booking.id);
    setCalendarDate(formatDateInputValue(booking.start_time));
    setBookingForm({
      contact_id: booking.contact_id || "",
      event_type: booking.event_type || eventType?.name || "Measure",
      duration_minutes: booking.duration_minutes || eventType?.minutes || minutes,
      date: formatDateInputValue(booking.start_time),
      slot,
      slotOptions: slotOptionsForEvent(booking.duration_minutes || eventType?.minutes || minutes),
      location_source: booking.location_source || booking.location_type || "manual",
      saved_location_id: "",
      location_name: booking.location_name || "",
      location_address: booking.location_address || "",
      notes: booking.notes || "",
      status: booking.status || "confirmed",
    });
    setBookingModalMode("edit");
    setBookingModalOpen(true);
  }

  async function handleCreateContact({ openBookingAfterSave = false } = {}) {
    setMessage("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("请先登录");
      if (duplicateResult.hasDuplicate && !window.confirm(buildDuplicateMessage(duplicateResult))) {
        return;
      }
      const newContact = await createContact({
        user_id: user.id,
        name: draft.name || "New Contact",
        phone: draft.phone || "",
        email: draft.email || "",
        address: draft.address || "",
        requirement: draft.requirement || "General enquiry",
        notes: [draft.notes || voiceInput, draft.preferredBookingNotes ? `Booking preference: ${draft.preferredBookingNotes}` : ""]
          .filter(Boolean)
          .join("\n\n"),
        status: draft.status || "New Lead",
        tags: draft.tags || [],
        source: "manual",
      });
      setContacts((prev) => [newContact, ...prev]);
      setSelectedContactId(newContact.id);
      setMessage(`已创建联系人：${newContact.name}`);
      if (openBookingAfterSave) {
        setActiveTab("calendar");
        openBookingForContact(newContact);
      } else {
        setActiveTab("contacts");
        resetBookingForm(newContact);
      }
    } catch (error) {
      console.error(error);
      setMessage(`创建联系人失败：${error.message}`);
    }
  }

  async function handleSaveContactDetails() {
    if (!selectedContact) return;
    setMessage("");
    try {
      const updated = await updateContact(selectedContact.id, {
        name: selectedContact.name || "",
        phone: selectedContact.phone || "",
        email: selectedContact.email || "",
        address: selectedContact.address || "",
        requirement: selectedContact.requirement || "",
        notes: selectedContact.notes || "",
        status: selectedContact.status || "New Lead",
        tags: selectedContact.tags || [],
      });
      setContacts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`联系人已保存：${updated.name}`);
    } catch (error) {
      console.error(error);
      setMessage(`保存联系人失败：${error.message}`);
    }
  }

  async function handleSaveBooking() {
    setMessage("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("请先登录");
      if (!bookingForm.contact_id) throw new Error("请先选择联系人");
      if (!bookingForm.slot) throw new Error("请先选择预约时间");
      const start = new Date(`${bookingForm.date}T${normalizeSlotValue(bookingForm.slot)}:00`);
      const end = new Date(
        `${bookingForm.date}T${computeEndTime(bookingForm.slot, bookingForm.duration_minutes)}:00`
      );
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("预约时间无效");
      }
      if (end <= start) throw new Error("结束时间必须晚于开始时间");

      const conflictCheck = await checkBookingConflict({
        userId: user.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        excludeBookingId: editingBookingId || null,
      });
      if (conflictCheck.hasConflict) {
        throw new Error("该时间段已有预约，请选择其他空档");
      }

      const payload = {
        user_id: user.id,
        contact_id: bookingForm.contact_id,
        event_type: bookingForm.event_type,
        duration_minutes: bookingForm.duration_minutes,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location_type: bookingForm.location_source,
        location_source: bookingForm.location_source,
        location_name: bookingForm.location_name,
        location_address: bookingForm.location_address,
        notes: bookingForm.notes || "",
        status: bookingForm.status || "confirmed",
      };

      if (editingBookingId) {
        const updated = await updateBooking(editingBookingId, payload);
        setBookings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setMessage("预约已更新");
      } else {
        const created = await createBooking(payload);
        setBookings((prev) => [created, ...prev]);
        setMessage("预约已创建");
      }

      setBookingModalOpen(false);
      setEditingBookingId("");
      setSelectedBookingId("");
    } catch (error) {
      console.error(error);
      setMessage(`保存预约失败：${error.message}`);
    }
  }

  async function handleDeleteBooking(bookingId) {
    if (!window.confirm("确认删除这个预约？")) return;
    setMessage("");
    try {
      await deleteBooking(bookingId);
      setBookings((prev) => prev.filter((item) => item.id !== bookingId));
      if (editingBookingId === bookingId) {
        setBookingModalOpen(false);
        setEditingBookingId("");
      }
      setMessage("预约已删除");
    } catch (error) {
      console.error(error);
      setMessage(`删除预约失败：${error.message}`);
    }
  }

  async function handleMarkContact(contact, nextStatus) {
    setMessage("");
    try {
      const updated = await updateContact(contact.id, { status: nextStatus });
      setContacts((prev) => prev.map((item) => (item.id === contact.id ? updated : item)));
      setMessage(`已更新 ${contact.name} 状态为 ${nextStatus}`);
    } catch (error) {
      console.error(error);
      setMessage(`更新联系人失败：${error.message}`);
    }
  }

  function handleBookingFormChange(field, value) {
    setBookingForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "event_type") {
        const eventType = getEventTypeByName(value);
        const minutes = eventType?.minutes || 60;
        next.duration_minutes = minutes;
        next.slotOptions = slotOptionsForEvent(minutes);
      }
      if (field === "slot") {
        next.slot = normalizeSlotValue(value);
      }
      if (field === "contact_id") {
        const contact = contacts.find((item) => item.id === value);
        if (next.location_source === "contact_address") {
          next.location_name = "Customer Address";
          next.location_address = contact?.address || "";
        }
      }
      if (field === "duration_minutes") {
        next.slotOptions = slotOptionsForEvent(Number(value) || 60);
      }
      return next;
    });
  }

  function updateSettingsList(field, value) {
    if (field === "statusOptions" || field === "tagOptions") {
      const items = value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      setSettingsDraft((prev) => ({ ...prev, [field]: items }));
      return;
    }
    setSettingsDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveSettings() {
    setMessage("");
    try {
      const next = await saveSettings({
        mode: "browser_local_storage",
        statusOptions: settingsDraft.statusOptions,
        tagOptions: settingsDraft.tagOptions,
        eventTypes: parseEventTypesInput(settingsDraft.eventTypesText),
        savedLocations: parseSavedLocationsInput(settingsDraft.savedLocationsText),
      });
      setSettings(next);
      setSavedLocations(next.savedLocations || []);
      setSettingsDraft({
        statusOptions: next.statusOptions,
        tagOptions: next.tagOptions,
        eventTypesText: eventTypesToText(next.eventTypes),
        savedLocationsText: savedLocationsToText(next.savedLocations || []),
      });
      setMessage("设置已保存到浏览器本地");
    } catch (error) {
      console.error(error);
      setMessage(`保存 Settings 失败：${error.message}`);
    }
  }

  async function handleSaveIntakeProfile() {
    setMessage("");
    try {
      const updated = await updateMyIntakeProfile(intakeDraft);
      setIntakeProfile(updated);
      setIntakeDraft({
        form_title: updated.form_title || "",
        intro_text: updated.intro_text || "",
        is_enabled: Boolean(updated.is_enabled),
      });
      setMessage("Intake 配置已保存");
    } catch (error) {
      console.error(error);
      setMessage(`保存 Intake 配置失败：${error.message}`);
    }
  }

  function handleExportContacts() {
    const rows = [
      ["name", "phone", "email", "address", "requirement", "status", "created_at"],
      ...filteredContacts.map((contact) => [
        contact.name,
        contact.phone,
        contact.email,
        contact.address,
        contact.requirement,
        contact.status,
        contact.created_at,
      ]),
    ];
    downloadCsv("voice-crm-contacts.csv", rows);
    setMessage("联系人 CSV 已导出");
  }

  function handleExportBookings() {
    const rows = [
      ["event_type", "contact_name", "start_time", "end_time", "location_name", "location_address"],
      ...bookings.map((booking) => {
        const contact = contacts.find((item) => item.id === booking.contact_id);
        return [
          booking.event_type,
          contact?.name || booking.contact_id,
          booking.start_time,
          booking.end_time,
          booking.location_name,
          booking.location_address,
        ];
      }),
    ];
    downloadCsv("voice-crm-bookings.csv", rows);
    setMessage("预约 CSV 已导出");
  }

  function shiftCalendarDate(days) {
    const current = new Date(calendarDate);
    current.setDate(current.getDate() + days);
    setCalendarDate(formatDateInputValue(current));
  }

  const intakeUrl = intakeProfile
    ? `${window.location.origin}/intake/${intakeProfile.intake_token}`
    : "";

  const tabButtons = [
    ["dashboard", "Overview"],
    ["contacts", "Contacts"],
    ["calendar", "Calendar"],
    ["capture", "Capture"],
    ["intake", "Intake"],
    ["settings", "Settings"],
  ];

  if (isPublicIntakeMode) {
    return (
      <Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
        <PublicIntakeScreen token={publicToken} />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="skeleton" style={{ height: 80 }} />
        <div className="metric-grid">
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
        <div className="skeleton" style={{ height: 360 }} />
      </div>
    );
  }

  return (
    <div style={ui.page}>
      <div className="app-shell">
        <div className="topbar" style={{ ...ui.sectionMuted, padding: 20 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em" }}>
              Voice CRM
            </div>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 14 }}>
              Fast capture · calendar booking · public intake
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tabButtons.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={activeTab === key ? ui.primaryBtn : ui.secondaryBtn}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {message ? (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              borderRadius: 14,
              padding: 12,
            }}
          >
            {message}
          </div>
        ) : null}

        {(activeTab === "dashboard" || activeTab === "contacts" || activeTab === "calendar") && (
          <div className="metric-grid">
            <MetricCard title="Contacts" value={contacts.length} hint="Fast capture, editing, and export" />
            <MetricCard title="Bookings" value={bookings.length} hint="Create directly from available calendar slots" />
            <MetricCard title="Saved Locations" value={savedLocations.length} hint="Customizable in Settings" />
            <MetricCard
              title="Public Intake"
              value={intakeProfile?.is_enabled ? "ON" : "OFF"}
              hint={intakeProfile?.intake_token || "Not configured"}
            />
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="dashboard-grid">
            <Section title="Quick Actions" muted>
              <div className="action-row">
                <button style={ui.primaryBtn} onClick={() => setActiveTab("capture")}>
                  Add New Contact
                </button>
                <button style={ui.secondaryBtn} onClick={() => setActiveTab("calendar")}>
                  Open Calendar
                </button>
                <button style={ui.secondaryBtn} onClick={handleExportContacts}>
                  Export Contacts
                </button>
                <button style={ui.secondaryBtn} onClick={handleExportBookings}>
                  Export Bookings
                </button>
              </div>
            </Section>
            <Section title="Recent Contacts">
              <div className="card-stack-tight">
                {contacts.slice(0, 5).map((contact) => (
                  <div
                    key={contact.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      border: "1px solid #eef2f7",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{contact.name}</div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>
                        {contact.requirement || "No requirement"}
                      </div>
                    </div>
                    <span style={statusBadgeStyle(contact.status)}>{contact.status}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {activeTab === "capture" && (
          <Section
            title="Natural Language Quick Capture"
            right={<button style={ui.secondaryBtn} onClick={fillFromVoice}>Auto Fill</button>}
          >
            <div className="list-stack">
              <textarea
                style={ui.textarea}
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                rows={5}
                placeholder="Example: Wang Xiaomei, phone 13800138000, lives in Longgang Buji, available Friday afternoon, wants an on-site visit."
              />
              <div className="field-grid-fit">
                <input
                  style={ui.input}
                  placeholder="姓名"
                  value={draft.name || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  style={ui.input}
                  placeholder="电话"
                  value={draft.phone || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <input
                  style={ui.input}
                  placeholder="邮箱"
                  value={draft.email || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  style={ui.input}
                  placeholder="地址"
                  value={draft.address || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                />
                <input
                  style={ui.input}
                  placeholder="需求"
                  value={draft.requirement || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, requirement: e.target.value }))}
                />
                <input
                  style={ui.input}
                  placeholder="预约偏好"
                  value={draft.preferredBookingNotes || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, preferredBookingNotes: e.target.value }))
                  }
                />
              </div>
              {duplicateResult.hasDuplicate ? (
                <div
                  style={{
                    fontSize: 13,
                    color: "#92400e",
                    background: "#fef3c7",
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  Possible duplicate found: {duplicateResult.matches.map((m) => m.contact.name).join(", ")}
                </div>
              ) : null}
              <div className="action-row">
                <button style={ui.primaryBtn} onClick={() => handleCreateContact({ openBookingAfterSave: true })}>
                  Save and Book
                </button>
                <button style={ui.secondaryBtn} onClick={() => handleCreateContact({ openBookingAfterSave: false })}>
                  Save Contact Only
                </button>
              </div>
            </div>
          </Section>
        )}

        {activeTab === "contacts" && (
          <div className="contacts-grid">
            <Section
              title="Contacts"
              right={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    style={ui.input}
                    placeholder="Search contacts"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button style={ui.secondaryBtn} onClick={handleExportContacts}>
                    Export CSV
                  </button>
                </div>
              }
            >
              <div className="list-stack">
                {filteredContacts.length === 0 ? (
                  <div className="empty-state">No contacts yet</div>
                ) : (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      style={{
                        textAlign: "left",
                        border:
                          selectedContact?.id === contact.id
                            ? "1px solid #0f172a"
                            : "1px solid #e5e7eb",
                        borderRadius: 16,
                        padding: 14,
                        background:
                          selectedContact?.id === contact.id ? "#f8fafc" : "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <strong style={{ fontSize: 15 }}>{contact.name || "Unnamed"}</strong>
                        <span style={statusBadgeStyle(contact.status)}>
                          {contact.status || "Unknown"}
                        </span>
                      </div>
                      <div style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>
                        {contact.phone || "No phone"} {contact.email ? `· ${contact.email}` : ""}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
                        {contact.address || "No address"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Section>

            <Section title={selectedContact ? `Contact Details · ${selectedContact.name}` : "Contact Details"}>
              {!selectedContact ? (
                <div className="empty-state">Please select a contact</div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <div className="field-grid-2">
                    <input
                      style={ui.input}
                      value={selectedContact.name || ""}
                      onChange={(e) => updateSelectedContactField("name", e.target.value)}
                      placeholder="姓名"
                    />
                    <input
                      style={ui.input}
                      value={selectedContact.phone || ""}
                      onChange={(e) => updateSelectedContactField("phone", e.target.value)}
                      placeholder="电话"
                    />
                    <input
                      style={ui.input}
                      value={selectedContact.email || ""}
                      onChange={(e) => updateSelectedContactField("email", e.target.value)}
                      placeholder="邮箱"
                    />
                    <select
                      style={ui.select}
                      value={selectedContact.status || "New Lead"}
                      onChange={(e) => updateSelectedContactField("status", e.target.value)}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    style={ui.textarea}
                    value={selectedContact.address || ""}
                    onChange={(e) => updateSelectedContactField("address", e.target.value)}
                    placeholder="地址"
                    rows={2}
                  />
                  <textarea
                    style={ui.textarea}
                    value={selectedContact.requirement || ""}
                    onChange={(e) => updateSelectedContactField("requirement", e.target.value)}
                    placeholder="需求"
                    rows={2}
                  />
                  <textarea
                    style={ui.textarea}
                    value={selectedContact.notes || ""}
                    onChange={(e) => updateSelectedContactField("notes", e.target.value)}
                    placeholder="Notes (you can include booking preference here)"
                    rows={4}
                  />
                  <div className="action-row">
                    <button style={ui.primaryBtn} onClick={handleSaveContactDetails}>
                      Save Contact
                    </button>
                    <button style={ui.secondaryBtn} onClick={() => handleMarkContact(selectedContact, "Contacted")}>
                      Mark Contacted
                    </button>
                    <button style={ui.secondaryBtn} onClick={() => handleMarkContact(selectedContact, "Quoted")}>
                      Mark Quoted
                    </button>
                    <button style={ui.secondaryBtn} onClick={() => openBookingForContact(selectedContact)}>
                      Book Now
                    </button>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: 10 }}>Bookings for This Contact</strong>
                    <div className="card-stack-tight">
                      {contactBookings.length === 0 ? (
                        <div className="empty-state">No bookings yet</div>
                      ) : (
                        contactBookings.map((booking) => (
                          <div
                            key={booking.id}
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: 14,
                              padding: 12,
                              background: "#fcfdff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "center",
                              }}
                            >
                              <strong>{booking.event_type}</strong>
                              <span style={{ color: "#64748b", fontSize: 13 }}>
                                {booking.location_source || booking.location_type}
                              </span>
                            </div>
                            <div style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>
                              {new Date(booking.start_time).toLocaleString("en-NZ")} →{" "}
                              {new Date(booking.end_time).toLocaleString("en-NZ")}
                            </div>
                            <div
                              style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
                            >
                              <button style={ui.secondaryBtn} onClick={() => startEditBooking(booking)}>
                                Edit Booking
                              </button>
                              <button
                                style={ui.dangerBtn}
                                onClick={() => handleDeleteBooking(booking.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="calendar-grid">
            <Section
              title="日历排程"
              right={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={ui.secondaryBtn} onClick={() => setCalendarDate(formatDateInputValue(new Date()))}>
                    今天
                  </button>
                  <button style={ui.secondaryBtn} onClick={handleExportBookings}>
                    导出预约
                  </button>
                </div>
              }
            >
              <DayTimeline
                selectedDate={calendarDate}
                selectedSlot={selectedSlot}
                selectedBookingId={selectedBookingId}
                bookings={bookings}
                contacts={contacts}
                onPrevDay={() => shiftCalendarDate(-1)}
                onToday={() => setCalendarDate(formatDateInputValue(new Date()))}
                onNextDay={() => shiftCalendarDate(1)}
                onDateChange={setCalendarDate}
                onPickSlot={(slot) => setSelectedSlot(normalizeSlotValue(slot))}
                onPickBooking={(id) => setSelectedBookingId(id)}
                onCreateBooking={openBookingFromSlot}
                onEditBooking={startEditBooking}
                onDeleteBooking={handleDeleteBooking}
                showAvailability={true}
                createLabel="Create Booking"
              />
            </Section>

            <Section title="Booking Notes" muted>
              <div className="card-stack-tight">
                <div>1. Click an open slot to create a booking immediately.</div>
                <div>2. Event type default duration comes from Settings.</div>
                <div>3. Address can come from customer address, saved locations, or manual entry.</div>
                <div>4. A conflict check runs before saving to avoid overlapping bookings.</div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "intake" && (
          <div className="intake-grid">
            <Section title="Public Intake Settings" muted>
              <div className="list-stack">
                <label
                  style={{ display: "flex", gap: 8, alignItems: "center", color: "#334155", fontWeight: 600 }}
                >
                  <input
                    type="checkbox"
                    checked={intakeDraft.is_enabled}
                    onChange={(e) =>
                      setIntakeDraft((prev) => ({ ...prev, is_enabled: e.target.checked }))
                    }
                  />
                  Enable public intake page
                </label>
                <input
                  style={ui.input}
                  value={intakeDraft.form_title}
                  onChange={(e) =>
                    setIntakeDraft((prev) => ({ ...prev, form_title: e.target.value }))
                  }
                  placeholder="Form title"
                />
                <textarea
                  style={ui.textarea}
                  value={intakeDraft.intro_text}
                  onChange={(e) =>
                    setIntakeDraft((prev) => ({ ...prev, intro_text: e.target.value }))
                  }
                  rows={5}
                  placeholder="Intro copy"
                />
                <button style={ui.primaryBtn} onClick={handleSaveIntakeProfile}>
                  Save Intake Settings
                </button>
              </div>
            </Section>
            <Section title="Intake Link">
              <div className="card-stack-tight">
                <div>
                  <strong>Public URL</strong>
                  <div style={{ color: "#475569", marginTop: 4, wordBreak: "break-all" }}>
                    {intakeUrl || "Unavailable"}
                  </div>
                </div>
                <div>
                  <button
                    style={ui.secondaryBtn}
                    onClick={() => {
                      if (!intakeUrl) return;
                      navigator.clipboard.writeText(intakeUrl);
                      setMessage("Intake link copied");
                    }}
                  >
                    Copy Link
                  </button>
                </div>
                <div style={{ color: "#64748b", fontSize: 14 }}>
                  Customers can open this link anonymously and submit their details, including booking time preferences.
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="intake-grid">
            <Section title="Event Types & Saved Locations" muted>
              <div className="list-stack">
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
                    Status options (one per line)
                  </div>
                  <textarea
                    style={ui.textarea}
                    rows={5}
                    value={(settingsDraft.statusOptions || []).join("\n")}
                    onChange={(e) => updateSettingsList("statusOptions", e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
                    Tag options (one per line)
                  </div>
                  <textarea
                    style={ui.textarea}
                    rows={4}
                    value={(settingsDraft.tagOptions || []).join("\n")}
                    onChange={(e) => updateSettingsList("tagOptions", e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
                    Event types (one per line: name|default minutes)
                  </div>
                  <textarea
                    style={ui.textarea}
                    rows={6}
                    value={settingsDraft.eventTypesText || ""}
                    onChange={(e) => updateSettingsList("eventTypesText", e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
                    Saved locations (one per line: name|full address)
                  </div>
                  <textarea
                    style={ui.textarea}
                    rows={6}
                    value={settingsDraft.savedLocationsText || ""}
                    onChange={(e) => updateSettingsList("savedLocationsText", e.target.value)}
                  />
                </div>
                <button style={ui.primaryBtn} onClick={handleSaveSettings}>
                  Save Settings
                </button>
              </div>
            </Section>
            <Section title="Current System State">
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  color: "#334155",
                }}
              >
                {JSON.stringify(
                  {
                    settingsMode: settings?.mode || "fallback_local",
                    eventTypes: settings?.eventTypes || [],
                    savedLocations,
                    intakeProfile,
                  },
                  null,
                  2
                )}
              </pre>
            </Section>
          </div>
        )}
      </div>

      <BookingEditor
        isOpen={bookingModalOpen}
        mode={bookingModalMode === "edit" ? "edit" : "create"}
        modalVariant={bookingModalMode}
        bookingForm={bookingForm}
        contacts={contacts}
        eventTypes={activeEventTypes}
        savedLocations={savedLocations}
        selectedContact={contacts.find((item) => item.id === bookingForm.contact_id) || null}
        bookings={bookings}
        selectedDate={calendarDate}
        selectedSlot={selectedSlot}
        selectedBookingId={selectedBookingId}
        onPrevDay={() => shiftCalendarDate(-1)}
        onToday={() => setCalendarDate(formatDateInputValue(new Date()))}
        onNextDay={() => shiftCalendarDate(1)}
        onDateChange={setCalendarDate}
        onPickSlot={(slot) => {
          const normalized = normalizeSlotValue(slot);
          setSelectedSlot(normalized);
          handleBookingFormChange("slot", normalized);
        }}
        onPickBooking={(id) => setSelectedBookingId(id)}
        onCreateBooking={openBookingFromSlot}
        onEditBooking={startEditBooking}
        onDeleteBooking={handleDeleteBooking}
        onClose={() => setBookingModalOpen(false)}
        onChange={handleBookingFormChange}
        onSave={handleSaveBooking}
      />
    </div>
  );
}
