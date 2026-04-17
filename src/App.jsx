import React, { useEffect, useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { ALL_TIME_SLOTS, DEFAULT_EVENT_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_TAG_OPTIONS, FIELD_LIMITS } from "./lib/constants";
import { formatDateInputValue, formatDateKey, slotToDateRange } from "./lib/dateUtils";
import { smartFill, runSelfTests } from "./lib/parsers/contactParser";
import { buildDuplicateMessage, findDuplicateContacts } from "./lib/parsers/duplicateChecker";
import Sidebar from "./components/layout/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import PublicIntakePage from "./pages/PublicIntakePage";
import CapturePage from "./pages/CapturePage";
import ContactsPage from "./pages/ContactsPage";
import ContactDetailPage from "./pages/ContactDetailPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import ExportPage from "./pages/ExportPage";
import BookingEditor from "./components/bookings/BookingEditor";
import { createContact, deleteContactCascade, fetchContacts, tryUpdateContactTags, updateContact } from "./services/contactsService";
import { createBooking, deleteBooking, fetchBookings, updateBooking } from "./services/bookingsService";
import { loadSettings, saveSettings } from "./services/settingsService";
import { fetchOrCreateMyIntakeProfile } from "./services/publicIntakeService";
import { createSavedLocation, deleteSavedLocation, fetchSavedLocations } from "./services/savedLocationsService";
import { supabase } from "./lib/supabase";

export default function App() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const intakeTokenFromPath = pathname.startsWith("/intake/") ? pathname.replace("/intake/", "").trim() : "";
  const isPublicIntakeRoute = Boolean(intakeTokenFromPath);

  const [view, setView] = useState("dashboard");
  const [contacts, setContacts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [query, setQuery] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);

  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [tagOptions, setTagOptions] = useState(DEFAULT_TAG_OPTIONS);
  const [eventTypes, setEventTypes] = useState(DEFAULT_EVENT_TYPES);
  const [settingsMode, setSettingsMode] = useState("browser_local_storage");

  const [voiceInput, setVoiceInput] = useState(
    "Tom phone 021 123 4567 email tom@test.com address 13 Preston Avenue, Mount Albert, Auckland wants living room shutters."
  );
  const [draft, setDraft] = useState(() => smartFill(voiceInput));

  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const [bookingEditorOpen, setBookingEditorOpen] = useState(false);
  const [bookingEditorMode, setBookingEditorMode] = useState("create");
  const [bookingEditorVariant, setBookingEditorVariant] = useState("calendar-create");
  const [editingBookingId, setEditingBookingId] = useState(null);

  const [intakeShareOpen, setIntakeShareOpen] = useState(false);
  const [intakeShareLoading, setIntakeShareLoading] = useState(false);
  const [intakeProfile, setIntakeProfile] = useState(null);

  const [bookingForm, setBookingForm] = useState({
    contact_id: "",
    event_type: DEFAULT_EVENT_TYPES[0].name,
    date: formatDateInputValue(new Date()),
    slot: "",
    slotOptions: ALL_TIME_SLOTS,
    location_source: "customer",
    saved_location_id: "",
    location_name: "Customer Address",
    location_address: "",
  });

  useEffect(() => {
    if (!isPublicIntakeRoute) loadInitialData();
  }, []);

  useEffect(() => {
    if (!isPublicIntakeRoute) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [view, isPublicIntakeRoute]);

  async function loadInitialData() {
    setLoadingContacts(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingContacts(false);
      return;
    }

    try {
      const [contactRows, bookingRows, settings, savedLocationRows] = await Promise.all([
        fetchContacts(),
        fetchBookings(),
        loadSettings(),
        fetchSavedLocations(),
      ]);
      setContacts(contactRows);
      setBookings(bookingRows);
      setSavedLocations(savedLocationRows);
      setStatusOptions(settings.statusOptions || DEFAULT_STATUS_OPTIONS);
      setTagOptions(settings.tagOptions || DEFAULT_TAG_OPTIONS);
      setEventTypes(settings.eventTypes || DEFAULT_EVENT_TYPES);
      setSettingsMode(settings.mode || "browser_local_storage");
      if (contactRows.length) setSelectedContact(contactRows[0]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingContacts(false);
    }
  }

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.phone, c.email, c.address, c.requirement, c.status, ...(c.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [contacts, query]);

  const duplicateCheck = useMemo(() => findDuplicateContacts(draft, contacts), [draft, contacts]);
  const testsPass = runSelfTests();

  const selectedCustomerForBooking =
    contacts.find((item) => item.id === bookingForm.contact_id) ||
    selectedContact ||
    null;

  function handleFill() {
    setDraft((prev) => ({ ...prev, ...smartFill(voiceInput) }));
  }

  function setSelectedDateByValue(dateValue) {
    const d = new Date(dateValue);
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setBookingForm((curr) => ({ ...curr, date: formatDateKey(d) }));
  }

  function changeSelectedDate(days) {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      d.setHours(0, 0, 0, 0);
      setBookingForm((curr) => ({ ...curr, date: formatDateKey(d) }));
      return d;
    });
  }

  function goToToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setBookingForm((curr) => ({ ...curr, date: formatDateKey(d) }));
  }

  function openContact(contact) {
    setSelectedContact(contact);
    setSelectedSlot("");
    setSelectedBookingId(null);
    setBookingEditorOpen(false);
    setView("detail");
  }

  function closeBookingEditor() {
    setBookingEditorOpen(false);
    setSelectedBookingId(null);
  }

  function openCalendarCreateBooking(slot) {
    setSelectedSlot(slot);
    setSelectedBookingId(null);
    setBookingEditorOpen(true);
    setBookingEditorMode("create");
    setBookingEditorVariant("calendar-create");
    setEditingBookingId(null);
    setBookingForm({
      contact_id: "",
      event_type: eventTypes[0]?.name || DEFAULT_EVENT_TYPES[0].name,
      date: formatDateKey(selectedDate),
      slot: slot || "",
      slotOptions: ALL_TIME_SLOTS,
      location_source: "customer",
      saved_location_id: "",
      location_name: "Customer Address",
      location_address: "",
    });
  }

  function openCustomerCreateBooking(contact, slot = "") {
    const baseDate = formatDateKey(selectedDate);
    setSelectedContact(contact);
    setSelectedSlot(slot || "");
    setSelectedBookingId(null);
    setBookingEditorOpen(true);
    setBookingEditorMode("create");
    setBookingEditorVariant("customer-create");
    setEditingBookingId(null);
    setBookingForm({
      contact_id: contact.id,
      event_type: eventTypes[0]?.name || DEFAULT_EVENT_TYPES[0].name,
      date: baseDate,
      slot: slot || "",
      slotOptions: ALL_TIME_SLOTS,
      location_source: "customer",
      saved_location_id: "",
      location_name: "Customer Address",
      location_address: contact.address || "",
    });
  }

  function openEditBooking(booking) {
    const selected = contacts.find((c) => c.id === booking.contact_id) || selectedContact || null;
    const start = new Date(booking.start_time);
    const slot = `${start.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${new Date(start.getTime() + 30 * 60000).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

    setSelectedBookingId(booking.id);
    setSelectedSlot("");
    setSelectedDate(new Date(formatDateKey(booking.start_time)));
    setSelectedContact(selected);
    setBookingEditorOpen(true);
    setBookingEditorMode("edit");
    setBookingEditorVariant("edit");
    setEditingBookingId(booking.id);
    setBookingForm({
      contact_id: booking.contact_id || "",
      event_type: booking.event_type || eventTypes[0]?.name || DEFAULT_EVENT_TYPES[0].name,
      date: formatDateKey(booking.start_time),
      slot,
      slotOptions: ALL_TIME_SLOTS,
      location_source: booking.location_type === "saved" ? "saved" : "customer",
      saved_location_id: "",
      location_name: booking.location_name || (booking.location_type === "saved" ? "" : "Customer Address"),
      location_address: booking.location_address || selected?.address || "",
    });
  }

  async function persistContact() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in first.");
      return null;
    }

    const duplicateResult = findDuplicateContacts(draft, contacts);
    if (duplicateResult.hasDuplicate) {
      const proceed = window.confirm(buildDuplicateMessage(duplicateResult));
      if (!proceed) {
        const firstMatch = duplicateResult.matches[0]?.contact;
        if (firstMatch) openContact(firstMatch);
        return null;
      }
    }

    const newContact = await createContact({
      user_id: user.id,
      name: (draft.name || "New Contact").slice(0, FIELD_LIMITS.contactName),
      phone: (draft.phone || "").slice(0, FIELD_LIMITS.phone),
      email: (draft.email || "").slice(0, FIELD_LIMITS.email),
      address: (draft.address || "").slice(0, FIELD_LIMITS.address),
      requirement: (draft.requirement || "General enquiry").slice(0, FIELD_LIMITS.requirement),
      notes: (draft.notes || voiceInput).slice(0, FIELD_LIMITS.notes),
      status: "New Lead",
      tags: [],
    });

    setContacts((prev) => [newContact, ...prev]);
    return newContact;
  }

  async function handleSaveContactOnly() {
    try {
      const newContact = await persistContact();
      if (!newContact) return;
      openContact(newContact);
    } catch (error) {
      console.error(error);
      alert(`Save failed: ${error.message}`);
    }
  }

  async function handleSaveContactAndAddBooking() {
    try {
      const newContact = await persistContact();
      if (!newContact) return;
      setView("detail");
      openCustomerCreateBooking(newContact);
    } catch (error) {
      console.error(error);
      alert(`Save failed: ${error.message}`);
    }
  }

  async function handleDeleteContact() {
    if (!selectedContact) return;
    const ok = window.confirm(`Delete ${selectedContact.name}? This will also remove related bookings.`);
    if (!ok) return;

    try {
      await deleteContactCascade(selectedContact.id);
      setBookings((prev) => prev.filter((b) => b.contact_id !== selectedContact.id));
      setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
      setSelectedContact(null);
      setView("contacts");
    } catch (error) {
      console.error(error);
      alert(`Delete failed: ${error.message}`);
    }
  }

  async function handleUpdateSelectedContactField(field, value) {
    if (!selectedContact) return;
    const updated = { ...selectedContact, [field]: value };
    setSelectedContact(updated);
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    try {
      const saved = await updateContact(selectedContact.id, { [field]: value });
      setSelectedContact((prev) => ({ ...prev, ...saved, tags: updated.tags }));
      setContacts((prev) => prev.map((c) => (c.id === saved.id ? { ...c, ...saved, tags: updated.tags } : c)));
    } catch (error) {
      console.error(error);
    }
  }

  async function handleToggleTag(tagName) {
    if (!selectedContact) return;
    const current = selectedContact.tags || [];
    const nextTags = current.includes(tagName) ? current.filter((t) => t !== tagName) : [...current, tagName];
    const updated = { ...selectedContact, tags: nextTags };
    setSelectedContact(updated);
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    try {
      await tryUpdateContactTags(selectedContact.id, nextTags);
    } catch (error) {
      console.warn(error);
    }
  }

  function calculateEndTime(start, eventTypeName) {
    const type = eventTypes.find((x) => x.name === eventTypeName) || eventTypes[0];
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (type?.minutes || 30));
    return end;
  }

  function handlePickSlot(slot) {
    setSelectedSlot(slot);
    setSelectedBookingId(null);
    setBookingForm((curr) => ({ ...curr, date: formatDateKey(selectedDate), slot }));
  }

  function handlePickBooking(bookingId) {
    setSelectedBookingId(bookingId);
    setSelectedSlot("");
  }

  function handleCreateBooking(slot) {
    openCalendarCreateBooking(slot);
  }

  async function handleDeleteBooking(bookingId) {
    const ok = window.confirm("Delete this booking?");
    if (!ok) return;
    try {
      await deleteBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      if (selectedBookingId === bookingId) setSelectedBookingId(null);
      setBookingEditorOpen(false);
    } catch (error) {
      console.error(error);
      alert(`Delete booking failed: ${error.message}`);
    }
  }

  function updateBookingForm(field, value) {
    setBookingForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "contact_id") {
        const customer = contacts.find((c) => c.id === value);
        if (next.location_source === "customer") {
          next.location_name = "Customer Address";
          next.location_address = customer?.address || "";
        }
      }
      return next;
    });
  }

  async function saveBookingFromEditor() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!bookingForm.contact_id || !bookingForm.event_type || !bookingForm.date || !bookingForm.slot) {
      alert("Please select customer, event type, and time.");
      return;
    }

    if (bookingForm.location_source === "saved" && !bookingForm.saved_location_id) {
      alert("Please choose a saved location.");
      return;
    }

    const range = slotToDateRange(new Date(bookingForm.date), bookingForm.slot);
    if (!range) {
      alert("Invalid slot.");
      return;
    }

    const minDurationMs = 30 * 60 * 1000;
    let newStart = range.start;
    let newEnd = calculateEndTime(newStart, bookingForm.event_type);

    let payload = {
      user_id: user.id,
      contact_id: bookingForm.contact_id,
      event_type: bookingForm.event_type,
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
      location_type: bookingForm.location_source,
      location_name: bookingForm.location_source === "saved" ? bookingForm.location_name : "Customer Address",
      location_address: bookingForm.location_address || "",
    };

    const otherBookings = bookings.filter((item) => !(bookingEditorMode === "edit" && editingBookingId && item.id === editingBookingId));
    const overlaps = otherBookings.filter((item) => {
      const itemStart = new Date(item.start_time);
      const itemEnd = new Date(item.end_time);
      return newStart < itemEnd && newEnd > itemStart;
    });

    const exactStartConflict = overlaps.find((item) => new Date(item.start_time).getTime() === newStart.getTime());
    if (exactStartConflict) {
      alert("This booking starts at exactly the same time as another event. Please move one of them by at least 15 to 30 minutes.");
      return;
    }

    let existingAdjustments = [];
    if (overlaps.length) {
      const proceed = window.confirm(
        "This booking overlaps with another event. Press OK to continue and auto-adjust the earlier event where possible, or Cancel to stop."
      );
      if (!proceed) return;

      let adjustedNewEnd = newEnd;
      for (const item of overlaps) {
        const itemStart = new Date(item.start_time);
        const itemEnd = new Date(item.end_time);

        if (itemStart < newStart) {
          if (newStart.getTime() - itemStart.getTime() < minDurationMs) {
            alert("Cannot auto-adjust because the earlier event would become shorter than 30 minutes.");
            return;
          }
          existingAdjustments.push({
            id: item.id,
            payload: { end_time: newStart.toISOString() },
          });
        } else if (itemStart > newStart && itemStart < adjustedNewEnd) {
          adjustedNewEnd = itemStart;
        }
      }

      if (adjustedNewEnd.getTime() - newStart.getTime() < minDurationMs) {
        alert("Cannot save because this booking would become shorter than 30 minutes after overlap adjustment.");
        return;
      }

      payload.end_time = adjustedNewEnd.toISOString();
    }

    try {
      for (const item of existingAdjustments) {
        const savedExisting = await updateBooking(item.id, item.payload);
        setBookings((prev) => prev.map((b) => (b.id === savedExisting.id ? savedExisting : b)));
      }

      if (bookingEditorMode === "edit" && editingBookingId) {
        const saved = await updateBooking(editingBookingId, payload);
        setBookings((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
      } else {
        const saved = await createBooking(payload);
        setBookings((prev) => [...prev, saved]);
      }

      closeBookingEditor();
      setSelectedSlot("");
    } catch (error) {
      console.error(error);
      alert(`Booking save failed: ${error.message}`);
    }
  }

  function addStatus(name) {
    setStatusOptions((prev) => [...prev, { id: crypto.randomUUID(), name: name.slice(0, FIELD_LIMITS.shortName), color: "bg-slate-100 text-slate-700" }]);
  }

  function editStatus(id, name) {
    setStatusOptions((prev) => prev.map((x) => (x.id === id ? { ...x, name: name.slice(0, FIELD_LIMITS.shortName) } : x)));
  }

  
  function addTag(name) {
    setTagOptions((prev) => [...prev, { id: crypto.randomUUID(), name: name.slice(0, FIELD_LIMITS.shortName), color: "bg-slate-100 text-slate-700" }]);
  }

  function removeTag(id) {
    setTagOptions((prev) => prev.filter((x) => x.id !== id));
  }

  function addEventType(name, minutes = 60) {
    setEventTypes((prev) => [...prev, { id: crypto.randomUUID(), name: name.slice(0, FIELD_LIMITS.shortName), minutes, color: "bg-slate-900 text-white" }]);
  }

  function removeEventType(id) {
    setEventTypes((prev) => prev.filter((x) => x.id !== id));
  }

  function editEventType(id, name, minutes) {
    setEventTypes((prev) => prev.map((x) => (x.id === id ? { ...x, name: name.slice(0, FIELD_LIMITS.shortName), minutes } : x)));
  }

  async function handleSaveSettings() {
    const result = await saveSettings({ statusOptions, tagOptions, eventTypes });
    setSettingsMode(result.mode || "browser_local_storage");
    alert("Settings saved.");
  }

  function handleResetDefaults() {
    const ok = window.confirm("Reset status, tag, and event type settings back to the default values?");
    if (!ok) return;
    setStatusOptions(DEFAULT_STATUS_OPTIONS);
    setTagOptions(DEFAULT_TAG_OPTIONS);
    setEventTypes(DEFAULT_EVENT_TYPES);
  }

  async function handleAddSavedLocation(payload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const created = await createSavedLocation({ user_id: user.id, ...payload });
      setSavedLocations((prev) => [...prev, created]);
    } catch (error) {
      console.error(error);
      alert(`Failed to add saved location: ${error.message}`);
    }
  }

  async function handleRemoveSavedLocation(id) {
    try {
      await deleteSavedLocation(id);
      setSavedLocations((prev) => prev.filter((x) => x.id !== id));
    } catch (error) {
      console.error(error);
      alert(`Failed to remove saved location: ${error.message}`);
    }
  }

  async function openIntakeShare() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in first.");
      return;
    }
    setIntakeShareLoading(true);
    try {
      const profile = await fetchOrCreateMyIntakeProfile(user.id);
      setIntakeProfile(profile);
      setIntakeShareOpen(true);
    } catch (error) {
      console.error(error);
      alert(`Failed to load QR intake profile: ${error.message}`);
    } finally {
      setIntakeShareLoading(false);
    }
  }

  if (isPublicIntakeRoute) {
    return <PublicIntakePage intakeToken={intakeTokenFromPath} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600">
                <Briefcase className="h-3.5 w-3.5" />
                One phone. Separate work from life.
              </div>
              <h1 className="mt-2 text-lg font-semibold tracking-tight md:text-2xl">Voice-first Client Workspace</h1>
              <p className="mt-1 hidden text-sm text-slate-500 md:block">
                Capture clients fast, keep full notes, contact instantly, manage bookings, and export filtered contacts.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr] md:gap-6 md:px-6 md:py-6">
          <Sidebar view={view} setView={setView} testsPass={testsPass} />

          <main className="min-w-0 space-y-5 md:space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
              <div className="text-xs uppercase tracking-wide text-slate-500">Current section</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {{
                  dashboard: "Dashboard",
                  capture: "Capture",
                  contacts: "Contacts",
                  detail: selectedContact?.name || "Contact Detail",
                  calendar: "Calendar",
                  settings: "Settings",
                  export: "Export",
                }[view] || "Workspace"}
              </div>
            </section>

            {view === "dashboard" && (
              <DashboardPage
                contacts={contacts}
                bookings={bookings}
                intakeShare={{
                  isOpen: intakeShareOpen,
                  isLoading: intakeShareLoading,
                  link: intakeProfile ? `${window.location.origin}/intake/${intakeProfile.intake_token}` : "",
                  qrImageUrl: intakeProfile ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${window.location.origin}/intake/${intakeProfile.intake_token}`)}` : "",
                  onOpen: openIntakeShare,
                  onClose: () => setIntakeShareOpen(false),
                }}
              />
            )}

            {view === "capture" && (
              <CapturePage
                voiceInput={voiceInput}
                setVoiceInput={setVoiceInput}
                draft={draft}
                setDraft={setDraft}
                duplicateCheck={duplicateCheck}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                selectedBookingId={selectedBookingId}
                bookings={bookings}
                contacts={contacts}
                onPrevDay={() => changeSelectedDate(-1)}
                onToday={goToToday}
                onNextDay={() => changeSelectedDate(1)}
                onPickSlot={handlePickSlot}
                onPickBooking={handlePickBooking}
                onCreateBooking={handleCreateBooking}
                onEditBooking={openEditBooking}
                onDeleteBooking={handleDeleteBooking}
                onHandleFill={handleFill}
                onSaveContact={handleSaveContactOnly}
                onSaveContactAndAddBooking={handleSaveContactAndAddBooking}
              />
            )}

            {view === "contacts" && (
              <ContactsPage
                query={query}
                setQuery={setQuery}
                filteredContacts={filteredContacts}
                loadingContacts={loadingContacts}
                onOpenContact={openContact}
                statusOptions={statusOptions}
              />
            )}

            {view === "detail" && (
              <ContactDetailPage
                contact={selectedContact}
                statusOptions={statusOptions}
                tagOptions={tagOptions}
                bookings={bookings}
                contacts={contacts}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                selectedBookingId={selectedBookingId}
                onPrevDay={() => changeSelectedDate(-1)}
                onToday={goToToday}
                onNextDay={() => changeSelectedDate(1)}
                onPickSlot={handlePickSlot}
                onPickBooking={handlePickBooking}
                onEditBooking={openEditBooking}
                onDeleteBooking={handleDeleteBooking}
                onBack={() => setView("contacts")}
                onDelete={handleDeleteContact}
                onChangeField={handleUpdateSelectedContactField}
                onToggleTag={handleToggleTag}
                onAddBooking={() => selectedContact && openCustomerCreateBooking(selectedContact)}
              />
            )}

            {view === "calendar" && (
              <CalendarPage
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                selectedBookingId={selectedBookingId}
                bookings={bookings}
                contacts={contacts}
                onPrevDay={() => changeSelectedDate(-1)}
                onToday={goToToday}
                onNextDay={() => changeSelectedDate(1)}
                onPickSlot={handlePickSlot}
                onPickBooking={handlePickBooking}
                onCreateBooking={handleCreateBooking}
                onEditBooking={openEditBooking}
                onDeleteBooking={handleDeleteBooking}
              />
            )}

            {view === "settings" && (
              <SettingsPage
                statusOptions={statusOptions}
                tagOptions={tagOptions}
                eventTypes={eventTypes}
                settingsMode={settingsMode}
                savedLocations={savedLocations}
                onAddStatus={addStatus}
                onEditStatus={editStatus}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onAddEventType={addEventType}
                onEditEventType={editEventType}
                onRemoveEventType={removeEventType}
                onAddSavedLocation={handleAddSavedLocation}
                onRemoveSavedLocation={handleRemoveSavedLocation}
                onSaveSettings={handleSaveSettings}
                onResetDefaults={handleResetDefaults}
              />
            )}

            {view === "export" && <ExportPage contacts={contacts} tagOptions={tagOptions} />}
          </main>
        </div>
      </div>

      <BookingEditor
        isOpen={bookingEditorOpen}
        mode={bookingEditorMode}
        modalVariant={bookingEditorVariant}
        bookingForm={bookingForm}
        contacts={contacts}
        eventTypes={eventTypes}
        savedLocations={savedLocations}
        selectedContact={selectedCustomerForBooking}
        bookings={bookings}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        selectedBookingId={selectedBookingId}
        onPrevDay={() => changeSelectedDate(-1)}
        onToday={goToToday}
        onNextDay={() => changeSelectedDate(1)}
        onDateChange={setSelectedDateByValue}
        onPickSlot={handlePickSlot}
        onPickBooking={handlePickBooking}
        onEditBooking={openEditBooking}
        onDeleteBooking={handleDeleteBooking}
        onClose={closeBookingEditor}
        onChange={updateBookingForm}
        onSave={saveBookingFromEditor}
      />
    </div>
  );
}
