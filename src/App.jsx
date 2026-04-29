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
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "./services/settingsService";
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
import SettingsPage from "./pages/SettingsPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

const PublicIntakeScreen = lazy(() => import("./pages/PublicIntakeScreen.jsx"));

const ui = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
    color: "#0f172a",
  },
  section: {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e2e8f0",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
    backdropFilter: "blur(8px)",
  },
  sectionMuted: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.92) 100%)",
    border: "1px solid #e2e8f0",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
    backdropFilter: "blur(8px)",
  },
  input: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    padding: "0 14px",
    background: "#fff",
    color: "#0f172a",
  },
  textarea: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    padding: 14,
    background: "#fff",
    color: "#0f172a",
    resize: "vertical",
  },
  select: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    padding: "0 14px",
    background: "#fff",
    color: "#0f172a",
  },
  primaryBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    borderRadius: 14,
    padding: "11px 15px",
    fontWeight: 700,
  },
  secondaryBtn: {
    background: "rgba(255,255,255,0.9)",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: "11px 15px",
    fontWeight: 700,
  },
  dangerBtn: {
    background: "#fff",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: 14,
    padding: "11px 15px",
    fontWeight: 700,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
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

function Section({ title, children, right, muted = false, description = "" }) {
  return (
    <section style={muted ? ui.sectionMuted : ui.section}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, letterSpacing: "-0.01em" }}>{title}</h2>
          {description ? (
            <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>{description}</div>
          ) : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ title, value, hint }) {
  return (
    <div style={{ ...ui.sectionMuted, padding: 14, boxShadow: "none" }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{value}</div>
      {hint ? <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>{hint}</div> : null}
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

function ensureSlotInOptions(slot, options = []) {
  const normalizedSlot = normalizeSlotValue(slot);
  if (!normalizedSlot) return options;
  const nextOptions = Array.isArray(options) ? [...options] : [];
  if (!nextOptions.includes(normalizedSlot)) {
    nextOptions.push(normalizedSlot);
    nextOptions.sort((a, b) => a.localeCompare(b));
  }
  return nextOptions;
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

function buildPublicIntakeAssets(profile) {
  const token = profile?.intake_token || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = profile?.public_url || (token && origin ? `${origin}/intake/${token}` : "");
  const qrCodeUrl = profile?.qr_code_url || (publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(publicUrl)}`
    : "");

  return {
    public_url: publicUrl,
    qr_code_url: qrCodeUrl,
  };
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
    "Wang Xiaomei, phone 13800138000, lives in Longgang Buji, available Friday afternoon, wants an on-site visit."
  );
  const [draft, setDraft] = useState(() => smartFill(voiceInput));
  const [intakeDraft, setIntakeDraft] = useState({
    form_title: "",
    intro_text: "",
    is_enabled: true,
    public_url: "",
    qr_code_url: "",
  });
  const [settingsDraft, setSettingsDraft] = useState({
    statusOptions: [],
    tagOptions: [],
    eventTypesText: "",
    savedLocationsText: "",
    eventTypes: [],
    savedLocations: [],
  });
  const [calendarDate, setCalendarDate] = useState(formatDateInputValue(new Date()));
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [intakeSheetOpen, setIntakeSheetOpen] = useState(false);
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
      const intakeAssets = buildPublicIntakeAssets(intake);
      setIntakeDraft({
        form_title: intake?.form_title || "",
        intro_text: intake?.intro_text || "",
        is_enabled: Boolean(intake?.is_enabled),
        public_url: intakeAssets.public_url,
        qr_code_url: intakeAssets.qr_code_url,
      });
      setSettingsDraft({
        statusOptions: settingsData?.statusOptions || [],
        tagOptions: settingsData?.tagOptions || [],
        eventTypesText: eventTypesToText(settingsData?.eventTypes || []),
        savedLocationsText: savedLocationsToText(mergedSavedLocations),
        eventTypes: settingsData?.eventTypes || [],
        savedLocations: mergedSavedLocations,
      });
      if (!selectedContactId && contactRows[0]?.id) setSelectedContactId(contactRows[0].id);
      if (settingsData?.eventTypes?.[0]?.name) {
        setBookingForm((prev) => ({
          ...prev,
          event_type: settingsData.eventTypes[0].name,
          duration_minutes: settingsData.eventTypes[0].minutes || 60,
          slotOptions: ensureSlotInOptions(prev.slot, slotOptionsForEvent(settingsData.eventTypes[0].minutes || 60)),
        }));
      }
    } catch (error) {
      console.error(error);
      setMessage(`Load failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isPublicIntakeMode) {
      loadInitialData();
    }
  }, [isPublicIntakeMode]);

  useEffect(() => {
    if (!bookingModalOpen || bookingModalMode !== "calendar-create" || !selectedSlot) return;
    const normalizedSlot = normalizeSlotValue(selectedSlot);
    setBookingForm((prev) => {
      if (prev.slot === normalizedSlot && (prev.slotOptions || []).includes(normalizedSlot)) {
        return prev;
      }
      return {
        ...prev,
        slot: normalizedSlot,
        slotOptions: ensureSlotInOptions(normalizedSlot, prev.slotOptions),
      };
    });
  }, [bookingModalMode, bookingModalOpen, selectedSlot]);

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
    const durationMinutes = overrides.duration_minutes || firstEventType.minutes || 60;
    const slotOptions = ensureSlotInOptions(defaultSlot, slotOptionsForEvent(durationMinutes));
    setEditingBookingId("");
    setSelectedBookingId("");
    setSelectedSlot(defaultSlot);
    setBookingForm({
      contact_id: overrides.contact_id ?? contact?.id ?? "",
      event_type: overrides.event_type || firstEventType.name,
      duration_minutes: durationMinutes,
      date: overrides.date || calendarDate || formatDateInputValue(new Date()),
      slot: defaultSlot,
      slotOptions,
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
    const preferredSlot = normalizeSlotValue(selectedSlot || "09:00");
    setCalendarDate(targetDate);
    resetBookingForm(contact, { date: targetDate, slot: preferredSlot });
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
      slotOptions: ensureSlotInOptions(slot, slotOptionsForEvent(booking.duration_minutes || eventType?.minutes || minutes)),
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
      if (!user) throw new Error("Please sign in first");
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
      setMessage(`Contact created: ${newContact.name}`);
      if (openBookingAfterSave) {
        setActiveTab("calendar");
        openBookingForContact(newContact);
      } else {
        setActiveTab("contacts");
        resetBookingForm(newContact);
      }
    } catch (error) {
      console.error(error);
      setMessage(`Create contact failed: ${error.message}`);
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
      setMessage(`Contact saved: ${updated.name}`);
    } catch (error) {
      console.error(error);
      setMessage(`Save contact failed: ${error.message}`);
    }
  }

  async function handleSaveBooking() {
    setMessage("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in first");
      if (!bookingForm.contact_id) throw new Error("Please select a contact first");
      if (!bookingForm.slot) throw new Error("Please select a booking time first");
      const start = new Date(`${bookingForm.date}T${normalizeSlotValue(bookingForm.slot)}:00`);
      const end = new Date(
        `${bookingForm.date}T${computeEndTime(bookingForm.slot, bookingForm.duration_minutes)}:00`
      );
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("Invalid booking time");
      }
      if (end <= start) throw new Error("End time must be later than start time");

      const conflictCheck = await checkBookingConflict({
        userId: user.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        excludeBookingId: editingBookingId || null,
      });
      if (conflictCheck.hasConflict) {
        throw new Error("This time slot already has a booking. Please choose another open slot.");
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
        setMessage("Booking updated");
      } else {
        const created = await createBooking(payload);
        setBookings((prev) => [created, ...prev]);
        setMessage("Booking created");
      }

      setBookingModalOpen(false);
      setEditingBookingId("");
      setSelectedBookingId("");
    } catch (error) {
      console.error(error);
      setMessage(`Save booking failed: ${error.message}`);
    }
  }

  async function handleDeleteBooking(bookingId) {
    if (!window.confirm("Delete this booking?")) return;
    setMessage("");
    try {
      await deleteBooking(bookingId);
      setBookings((prev) => prev.filter((item) => item.id !== bookingId));
      if (editingBookingId === bookingId) {
        setBookingModalOpen(false);
        setEditingBookingId("");
      }
      setMessage("Booking deleted");
    } catch (error) {
      console.error(error);
      setMessage(`Delete booking failed: ${error.message}`);
    }
  }

  async function handleMarkContact(contact, nextStatus) {
    setMessage("");
    try {
      const updated = await updateContact(contact.id, { status: nextStatus });
      setContacts((prev) => prev.map((item) => (item.id === contact.id ? updated : item)));
      setMessage(`Updated ${contact.name} to ${nextStatus}`);
    } catch (error) {
      console.error(error);
      setMessage(`Update contact failed: ${error.message}`);
    }
  }

  function handleBookingFormChange(field, value) {
    setBookingForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "event_type") {
        const eventType = getEventTypeByName(value);
        const minutes = eventType?.minutes || 60;
        next.duration_minutes = minutes;
        next.slotOptions = ensureSlotInOptions(next.slot, slotOptionsForEvent(minutes));
      }
      if (field === "slot") {
        next.slot = normalizeSlotValue(value);
        next.slotOptions = ensureSlotInOptions(next.slot, next.slotOptions);
      }
      if (field === "contact_id") {
        const contact = contacts.find((item) => item.id === value);
        if (next.location_source === "contact_address") {
          next.location_name = "Customer Address";
          next.location_address = contact?.address || "";
        }
      }
      if (field === "duration_minutes") {
        next.slotOptions = ensureSlotInOptions(next.slot, slotOptionsForEvent(Number(value) || 60));
      }
      return next;
    });
  }


  function syncStructuredSettings(patch) {
    setSettingsDraft((prev) => {
      const next = { ...prev, ...patch };
      const eventTypes = patch.eventTypes ?? next.eventTypes ?? parseEventTypesInput(next.eventTypesText || "");
      const savedLocations = patch.savedLocations ?? next.savedLocations ?? parseSavedLocationsInput(next.savedLocationsText || "");
      return {
        ...next,
        eventTypes,
        savedLocations,
        eventTypesText: eventTypesToText(eventTypes),
        savedLocationsText: savedLocationsToText(savedLocations),
      };
    });
  }

  function addStatusOption(name) {
    if (!name) return;
    if ((settingsDraft.statusOptions || []).includes(name)) return;
    setSettingsDraft((prev) => ({
      ...prev,
      statusOptions: [...(prev.statusOptions || []), name],
    }));
  }

  function editStatusOption(index, name) {
    if (!name) return;
    setSettingsDraft((prev) => ({
      ...prev,
      statusOptions: (prev.statusOptions || []).map((item, i) => (String(i) === String(index) ? name : item)),
    }));
  }

  function addTagOption(name) {
    if (!name) return;
    if ((settingsDraft.tagOptions || []).includes(name)) return;
    setSettingsDraft((prev) => ({
      ...prev,
      tagOptions: [...(prev.tagOptions || []), name],
    }));
  }

  function removeTagOption(index) {
    setSettingsDraft((prev) => ({
      ...prev,
      tagOptions: (prev.tagOptions || []).filter((_, i) => String(i) !== String(index)),
    }));
  }

  function addEventType(name, minutes) {
    const next = [
      ...(settingsDraft.eventTypes || []),
      { id: `event-${Date.now()}`, name, minutes: Number(minutes) || 60, isActive: true },
    ];
    syncStructuredSettings({ eventTypes: next });
  }

  function editEventType(id, name, minutes) {
    const next = (settingsDraft.eventTypes || []).map((item) =>
      item.id === id ? { ...item, name, minutes: Number(minutes) || 60 } : item
    );
    syncStructuredSettings({ eventTypes: next });
  }

  function removeEventType(id) {
    const next = (settingsDraft.eventTypes || []).filter((item) => item.id !== id);
    syncStructuredSettings({ eventTypes: next });
  }

  function addSavedLocation(location) {
    const next = [
      ...(settingsDraft.savedLocations || []),
      { id: `location-${Date.now()}`, ...location, isActive: true },
    ];
    syncStructuredSettings({ savedLocations: next });
  }

  function removeSavedLocation(id) {
    const next = (settingsDraft.savedLocations || []).filter((item) => item.id !== id);
    syncStructuredSettings({ savedLocations: next });
  }

  function resetSettingsDefaults() {
    const base = DEFAULT_SETTINGS;
    setSettingsDraft({
      statusOptions: base.statusOptions,
      tagOptions: base.tagOptions,
      eventTypesText: eventTypesToText(base.eventTypes),
      savedLocationsText: savedLocationsToText(base.savedLocations),
      eventTypes: base.eventTypes,
      savedLocations: base.savedLocations,
    });
    setMessage("Settings reset to defaults. Save to apply.");
  }

  async function handleSaveSettings() {
    setMessage("");
    try {
      const next = await saveSettings({
        mode: "browser_local_storage",
        statusOptions: settingsDraft.statusOptions,
        tagOptions: settingsDraft.tagOptions,
        eventTypes: settingsDraft.eventTypes,
        savedLocations: settingsDraft.savedLocations,
      });
      setSettings(next);
      setSavedLocations(next.savedLocations || []);
      setSettingsDraft({
        statusOptions: next.statusOptions,
        tagOptions: next.tagOptions,
        eventTypesText: eventTypesToText(next.eventTypes),
        savedLocationsText: savedLocationsToText(next.savedLocations || []),
        eventTypes: next.eventTypes,
        savedLocations: next.savedLocations || [],
      });
      setMessage("Settings saved locally in browser");
    } catch (error) {
      console.error(error);
      setMessage(`Save settings failed: ${error.message}`);
    }
  }

  async function handleSaveIntakeProfile() {
    setMessage("");
    try {
      const updated = await updateMyIntakeProfile(intakeDraft);
      const intakeAssets = buildPublicIntakeAssets(updated);
      setIntakeProfile(updated);
      setIntakeDraft({
        form_title: updated.form_title || "",
        intro_text: updated.intro_text || "",
        is_enabled: Boolean(updated.is_enabled),
        public_url: intakeAssets.public_url,
        qr_code_url: intakeAssets.qr_code_url,
      });
      setMessage("Intake settings saved");
    } catch (error) {
      console.error(error);
      setMessage(`Save intake settings failed: ${error.message}`);
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
    setMessage("Contacts CSV exported");
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
    setMessage("Bookings CSV exported");
  }

  function shiftCalendarDate(days) {
    const current = new Date(calendarDate);
    current.setDate(current.getDate() + days);
    setCalendarDate(formatDateInputValue(current));
  }

  const intakeUrl = intakeProfile && typeof window !== "undefined"
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
      <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
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
        <div className="topbar workspace-hero workspace-hero-app" style={{ ...ui.sectionMuted, padding: 22 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2563eb" }}>
              Voice CRM Workspace
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", marginTop: 6 }}>
              Fast capture, booking, and intake in one place
            </div>
            <div style={{ marginTop: 8, color: "#64748b", fontSize: 14, maxWidth: 720 }}>
              Keep contact capture simple, move straight into scheduling, and give customers a clean intake link.
            </div>
          </div>
          <div className="tabbar-wrap app-tabbar">
            {tabButtons.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`app-tab ${activeTab === key ? "is-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {message ? (
          <div className="app-toast">
            {message}
          </div>
        ) : null}

        {(activeTab === "dashboard" || activeTab === "contacts" || activeTab === "calendar") && (
          <div className="metric-grid metric-grid-compact">
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
          <DashboardPage
            contacts={contacts}
            bookings={bookings}
            intakeShare={{
              isOpen: intakeSheetOpen,
              link: intakeDraft.public_url,
              qrImageUrl: intakeDraft.qr_code_url,
              onOpen: () => setIntakeSheetOpen(true),
              onClose: () => setIntakeSheetOpen(false),
            }}
            onOpenContact={(contact) => {
              setSelectedContactId(contact.id);
              setActiveTab("contacts");
            }}
            onEditBooking={startEditBooking}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {activeTab === "capture" && (
          <div className="mobile-flow-stack">
            <Section
              title="Natural Language Quick Capture"
              description="Paste or dictate a rough note, then auto-fill the contact form before saving."
              right={<button style={ui.secondaryBtn} onClick={fillFromVoice}>Auto Fill</button>}
            >
              <div className="list-stack">
                <textarea
                  style={{ ...ui.textarea, minHeight: 132 }}
                  value={voiceInput}
                  onChange={(e) => setVoiceInput(e.target.value)}
                  rows={6}
                  placeholder="Example: Wang Xiaomei, phone 13800138000, lives in Longgang Buji, available Friday afternoon, wants an on-site visit."
                />
                {duplicateResult.hasDuplicate ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: "#92400e",
                      background: "#fef3c7",
                      borderRadius: 14,
                      padding: 12,
                      border: "1px solid #fde68a",
                    }}
                  >
                    Possible duplicate found: {duplicateResult.matches.map((m) => m.contact.name).join(", ")}
                  </div>
                ) : null}
              </div>
            </Section>

            <Section
              title="Contact Preview"
              description="Review the parsed details before saving or jumping straight into booking."
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div className="field-grid-2 mobile-single-grid">
                  <input
                    style={ui.input}
                    placeholder="Name"
                    value={draft.name || ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    style={ui.input}
                    placeholder="Phone"
                    value={draft.phone || ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                  <input
                    style={ui.input}
                    placeholder="Email"
                    value={draft.email || ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <input
                    style={ui.input}
                    placeholder="Booking preference"
                    value={draft.preferredBookingNotes || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, preferredBookingNotes: e.target.value }))
                    }
                  />
                </div>
                <textarea
                  style={ui.textarea}
                  placeholder="Address"
                  value={draft.address || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                  rows={2}
                />
                <textarea
                  style={ui.textarea}
                  placeholder="Requirement"
                  value={draft.requirement || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, requirement: e.target.value }))}
                  rows={3}
                />
                <div className="action-row mobile-action-stack">
                  <button style={ui.primaryBtn} onClick={() => handleCreateContact({ openBookingAfterSave: true })}>
                    Save and Book
                  </button>
                  <button style={ui.secondaryBtn} onClick={() => handleCreateContact({ openBookingAfterSave: false })}>
                    Save Contact Only
                  </button>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="mobile-flow-stack contacts-mobile-stack">
            <Section
              title="Contacts"
              description="Search and tap a customer card to review details or book immediately."
              right={
                <div className="mobile-header-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              <div className="contact-mobile-list">
                {filteredContacts.length === 0 ? (
                  <div className="empty-state">No contacts yet</div>
                ) : (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      className={`contact-mobile-card ${selectedContact?.id === contact.id ? "is-active" : ""}`}
                    >
                      <div className="contact-mobile-row">
                        <strong style={{ fontSize: 15 }}>{contact.name || "Unnamed"}</strong>
                        <span style={statusBadgeStyle(contact.status)}>
                          {contact.status || "Unknown"}
                        </span>
                      </div>
                      <div style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>
                        {contact.phone || "No phone"} {contact.email ? `· ${contact.email}` : ""}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
                        {contact.requirement || contact.address || "No requirement yet"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Section>

            <Section title={selectedContact ? `Contact Details · ${selectedContact.name}` : "Contact Details"} description="Update details, track status, and manage bookings from one mobile-friendly card.">
              {!selectedContact ? (
                <div className="empty-state">Please select a contact</div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <div className="field-grid-2 mobile-single-grid">
                    <input
                      style={ui.input}
                      value={selectedContact.name || ""}
                      onChange={(e) => updateSelectedContactField("name", e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      style={ui.input}
                      value={selectedContact.phone || ""}
                      onChange={(e) => updateSelectedContactField("phone", e.target.value)}
                      placeholder="Phone"
                    />
                    <input
                      style={ui.input}
                      value={selectedContact.email || ""}
                      onChange={(e) => updateSelectedContactField("email", e.target.value)}
                      placeholder="Email"
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
                    placeholder="Address"
                    rows={2}
                  />
                  <textarea
                    style={ui.textarea}
                    value={selectedContact.requirement || ""}
                    onChange={(e) => updateSelectedContactField("requirement", e.target.value)}
                    placeholder="Requirement"
                    rows={2}
                  />
                  <textarea
                    style={ui.textarea}
                    value={selectedContact.notes || ""}
                    onChange={(e) => updateSelectedContactField("notes", e.target.value)}
                    placeholder="Notes (you can include booking preference here)"
                    rows={4}
                  />
                  <div className="action-row mobile-action-stack">
                    <button style={ui.primaryBtn} onClick={handleSaveContactDetails}>
                      Save Contact
                    </button>
                    <button style={ui.secondaryBtn} onClick={() => openBookingForContact(selectedContact)}>
                      Book Now
                    </button>
                    <button style={ui.secondaryBtn} onClick={() => handleMarkContact(selectedContact, "Contacted")}>
                      Mark Contacted
                    </button>
                    <button style={ui.secondaryBtn} onClick={() => handleMarkContact(selectedContact, "Quoted")}>
                      Mark Quoted
                    </button>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: 10 }}>Bookings for This Contact</strong>
                    <div className="card-stack-tight">
                      {contactBookings.length === 0 ? (
                        <div className="empty-state">No bookings yet</div>
                      ) : (
                        contactBookings.map((booking) => (
                          <div key={booking.id} className="contact-booking-card">
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                              <strong>{booking.event_type}</strong>
                              <span style={{ color: "#64748b", fontSize: 13 }}>
                                {booking.location_source || booking.location_type}
                              </span>
                            </div>
                            <div style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>
                              {new Date(booking.start_time).toLocaleString("en-NZ")} → {new Date(booking.end_time).toLocaleString("en-NZ")}
                            </div>
                            <div className="action-row mobile-action-stack" style={{ marginTop: 10 }}>
                              <button style={ui.secondaryBtn} onClick={() => startEditBooking(booking)}>
                                Edit Booking
                              </button>
                              <button style={ui.dangerBtn} onClick={() => handleDeleteBooking(booking.id)}>
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
              title="Calendar Scheduler"
              description="See open time clearly, create bookings from empty slots, and edit conflicts fast."
              right={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={ui.secondaryBtn} onClick={() => setCalendarDate(formatDateInputValue(new Date()))}>
                    Today
                  </button>
                  <button style={ui.secondaryBtn} onClick={handleExportBookings}>
                    Export Bookings
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

            <Section title="Booking Notes" muted description="Booking rules and context for the current scheduling flow.">
              <div className="card-stack-tight booking-notes-mobile">
                <div>Tap an open time to start a booking immediately.</div>
                <div>Event types use default durations from Settings.</div>
                <div>Location can come from customer address, saved locations, or manual entry.</div>
                <div>Conflicts are checked before saving.</div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "intake" && (
          <div className="mobile-flow-stack">
            <Section title="Public Intake Settings" muted description="Control the customer-facing form, then share one clean public link.">
              <div className="list-stack">
                <label
                  style={{ display: "flex", gap: 10, alignItems: "center", color: "#334155", fontWeight: 600 }}
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
                  style={{ ...ui.textarea, minHeight: 120 }}
                  value={intakeDraft.intro_text}
                  onChange={(e) =>
                    setIntakeDraft((prev) => ({ ...prev, intro_text: e.target.value }))
                  }
                  rows={5}
                  placeholder="Intro copy"
                />
                <div className="action-row mobile-action-stack">
                  <button style={ui.primaryBtn} onClick={handleSaveIntakeProfile}>
                    Save Intake Settings
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Intake Link" description="Share this page with customers so they can submit details directly into CRM from their phone.">
              <div className="intake-link-card">
                <div className="intake-link-label">Public URL</div>
                <div className="intake-link-value">
                  {intakeUrl || "Unavailable"}
                </div>
                <div className="action-row mobile-action-stack">
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
                <div className="intake-link-hint">
                  Customers can open this link anonymously and submit their details, including booking time preferences.
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsPage
            statusOptions={(settingsDraft.statusOptions || []).map((name, index) => ({ id: String(index), name }))}
            tagOptions={(settingsDraft.tagOptions || []).map((name, index) => ({ id: String(index), name }))}
            eventTypes={settingsDraft.eventTypes || []}
            settingsMode={settings?.mode || "browser_local_storage"}
            savedLocations={settingsDraft.savedLocations || []}
            onAddStatus={addStatusOption}
            onEditStatus={editStatusOption}
            onAddTag={addTagOption}
            onRemoveTag={removeTagOption}
            onAddEventType={addEventType}
            onEditEventType={editEventType}
            onRemoveEventType={removeEventType}
            onAddSavedLocation={addSavedLocation}
            onRemoveSavedLocation={removeSavedLocation}
            onSaveSettings={handleSaveSettings}
            onResetDefaults={resetSettingsDefaults}
          />
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
