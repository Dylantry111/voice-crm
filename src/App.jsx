import React, { useEffect, useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { ALL_TIME_SLOTS, DEFAULT_EVENT_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_TAG_OPTIONS } from "./lib/constants";
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
import { createContact, deleteContactCascade, fetchContacts, tryUpdateContactTags, updateContact } from "./services/contactsService";
import { createBooking, deleteBooking, fetchBookings, updateBooking } from "./services/bookingsService";
import { loadSettings, saveSettings } from "./services/settingsService";
import { fetchOrCreateMyIntakeProfile } from "./services/publicIntakeService";
import { supabase } from "./lib/supabase";

export default function App() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const intakeTokenFromPath = pathname.startsWith("/intake/") ? pathname.replace("/intake/", "").trim() : "";
  const isPublicIntakeRoute = Boolean(intakeTokenFromPath);

  const [view, setView] = useState("dashboard");
  const [contacts, setContacts] = useState([]);
  const [bookings, setBookings] = useState([]);
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
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [bookingEditorScrollKey, setBookingEditorScrollKey] = useState(0);
  const [intakeShareOpen, setIntakeShareOpen] = useState(false);
  const [intakeShareLoading, setIntakeShareLoading] = useState(false);
  const [intakeProfile, setIntakeProfile] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    contact_id: "",
    event_type: DEFAULT_EVENT_TYPES[0].name,
    date: formatDateInputValue(new Date()),
    slot: "",
    slotOptions: ALL_TIME_SLOTS,
  });

  useEffect(() => {
    if (!isPublicIntakeRoute) loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoadingContacts(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingContacts(false);
      return;
    }

    try {
      const [contactRows, bookingRows, settings] = await Promise.all([
        fetchContacts(),
        fetchBookings(),
        loadSettings(),
      ]);
      setContacts(contactRows);
      setBookings(bookingRows);
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

  function touchScrollTarget() {
    setBookingEditorScrollKey((prev) => prev + 1);
  }

  function openContact(contact) {
    setSelectedContact(contact);
    setSelectedSlot("");
    setSelectedBookingId(null);
    setBookingEditorOpen(true);
    setBookingEditorMode("create");
    setEditingBookingId(null);
    setBookingForm({
      contact_id: contact.id,
      event_type: eventTypes[0]?.name || DEFAULT_EVENT_TYPES[0].name,
      date: formatDateKey(selectedDate),
      slot: "",
      slotOptions: ALL_TIME_SLOTS,
    });
    touchScrollTarget();
    setView("detail");
  }

  function changeSelectedDate(days) {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      d.setHours(0, 0, 0, 0);
      const key = formatDateKey(d);
      setBookingForm((curr) => ({ ...curr, date: key }));
      return d;
    });
  }

  function goToToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setBookingForm((curr) => ({ ...curr, date: formatDateKey(d) }));
  }

  function handleFill() {
    setDraft((prev) => ({ ...prev, ...smartFill(voiceInput) }));
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
      name: draft.name || "New Contact",
      phone: draft.phone || "",
      email: draft.email || "",
      address: draft.address || "",
      requirement: draft.requirement || "General enquiry",
      notes: draft.notes || voiceInput,
      status: "New",
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
      setSelectedContact(newContact);
      setBookingEditorOpen(true);
      setBookingEditorMode("create");
      setEditingBookingId(null);
      setBookingForm({
        contact_id: newContact.id,
        event_type: eventTypes[0]?.name || DEFAULT_EVENT_TYPES[0].name,
        date: formatDateKey(selectedDate),
        slot: selectedSlot || "",
        slotOptions: ALL_TIME_SLOTS,
      });
      touchScrollTarget();
      setView("detail");
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

  function openCreateBookingForCurrentContact(slot = "") {
    if (!selectedContact) return;
    setSelectedSlot(slot);
    setSelectedBookingId(null);
    setBookingEditorOpen(true);
    setBookingEditorMode("create");
    setEditingBookingId(null);
    setBookingForm({
      contact_id: selectedContact.id,
      event_type: bookingForm.event_type || eventTypes[0]?.name || DEFAULT_EVENT_TYPES[0].name,
      date: formatDateKey(selectedDate),
      slot: slot || "",
      slotOptions: ALL_TIME_SLOTS,
    });
    touchScrollTarget();
  }

  function handlePickSlot(slot) {
    setSelectedSlot(slot);
    setSelectedBookingId(null);

    if (view === "detail" && selectedContact) {
      setBookingEditorOpen(true);
      setBookingEditorMode("create");
      setEditingBookingId(null);
      setBookingForm((curr) => ({
        ...curr,
        contact_id: selectedContact.id,
        date: formatDateKey(selectedDate),
        slot,
      }));
    }
  }

  function handlePickBooking(bookingId) {
    setSelectedBookingId(bookingId);
    setSelectedSlot("");
  }

  function handleCreateBooking(slot) {
    setSelectedSlot(slot);
    setSelectedBookingId(null);

    if (view === "detail" && selectedContact) {
      openCreateBookingForCurrentContact(slot);
      return;
    }

    setBookingEditorOpen(true);
    setBookingEditorMode("create");
    setEditingBookingId(null);
    setBookingForm((prev) => ({
      ...prev,
      slot,
      date: formatDateKey(selectedDate),
      contact_id: prev.contact_id || selectedContact?.id || "",
      event_type: prev.event_type || eventTypes[0]?.name || DEFAULT_EVENT_TYPES[0].name,
      slotOptions: ALL_TIME_SLOTS,
    }));
    touchScrollTarget();
  }

  function handleEditBooking(booking) {
    setSelectedBookingId(booking.id);
    setSelectedSlot("");
    setBookingEditorOpen(true);
    setBookingEditorMode("edit");
    setEditingBookingId(booking.id);
    setBookingForm({
      contact_id: view === "detail" && selectedContact ? selectedContact.id : (booking.contact_id || ""),
      event_type: booking.event_type || eventTypes[0]?.name || DEFAULT_EVENT_TYPES[0].name,
      date: formatDateKey(booking.start_time),
      slot: `${new Date(booking.start_time).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${new Date(new Date(booking.start_time).getTime() + 30 * 60000).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
      slotOptions: ALL_TIME_SLOTS,
    });
    touchScrollTarget();
  }

  async function handleDeleteBooking(bookingId) {
    const ok = window.confirm("Delete this booking?");
    if (!ok) return;
    try {
      await deleteBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      if (selectedBookingId === bookingId) setSelectedBookingId(null);
    } catch (error) {
      console.error(error);
      alert(`Delete booking failed: ${error.message}`);
    }
  }

  function updateBookingForm(field, value) {
    setBookingForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveBookingFromEditor() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!bookingForm.contact_id || !bookingForm.date || !bookingForm.slot) {
      alert("Please select customer, date, and start slot.");
      return;
    }

    const range = slotToDateRange(new Date(bookingForm.date), bookingForm.slot);
    if (!range) {
      alert("Invalid slot.");
      return;
    }

    const realEnd = calculateEndTime(range.start, bookingForm.event_type);
    const payload = {
      user_id: user.id,
      contact_id: bookingForm.contact_id,
      event_type: bookingForm.event_type,
      start_time: range.start.toISOString(),
      end_time: realEnd.toISOString(),
    };

    const overlapItems = bookings.filter((item) => {
      if (bookingEditorMode === "edit" && editingBookingId && item.id === editingBookingId) return false;
      const itemStart = new Date(item.start_time);
      const itemEnd = new Date(item.end_time);
      return range.start < itemEnd && realEnd > itemStart;
    });

    if (overlapItems.length) {
      const proceed = window.confirm(
        `This booking overlaps with ${overlapItems.length} existing booking(s). Press OK to continue anyway, or Cancel to stop.`
      );
      if (!proceed) return;
    }

    try {
      if (bookingEditorMode === "edit" && editingBookingId) {
        const saved = await updateBooking(editingBookingId, payload);
        setBookings((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
      } else {
        const saved = await createBooking(payload);
        setBookings((prev) => [...prev, saved]);
      }
      setBookingEditorOpen(false);
      setSelectedSlot("");
      setSelectedBookingId(null);
    } catch (error) {
      console.error(error);
      alert(`Booking save failed: ${error.message}`);
    }
  }


  function addStatus(name) {
    setStatusOptions((prev) => [...prev, { id: crypto.randomUUID(), name, color: "bg-slate-100 text-slate-700" }]);
  }

  function removeStatus(id) {
    setStatusOptions((prev) => prev.filter((x) => x.id !== id));
  }

  function addTag(name) {
    setTagOptions((prev) => [...prev, { id: crypto.randomUUID(), name, color: "bg-slate-100 text-slate-700" }]);
  }

  function removeTag(id) {
    setTagOptions((prev) => prev.filter((x) => x.id !== id));
  }

  function addEventType(name, minutes = 60) {
    setEventTypes((prev) => [...prev, { id: crypto.randomUUID(), name, minutes, color: "bg-slate-900 text-white" }]);
  }

  function removeEventType(id) {
    setEventTypes((prev) => prev.filter((x) => x.id !== id));
  }

  function updateEventTypeMinutes(id, minutes) {
    setEventTypes((prev) =>
      prev.map((x) => (x.id === id ? { ...x, minutes } : x))
    );
  }

  async function handleSaveSettings() {
    const result = await saveSettings({
      statusOptions,
      tagOptions,
      eventTypes,
    });
    setSettingsMode(result.mode || "browser_local_storage");
    alert("Settings saved.");
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



  const bookingEditorProps = {
    isOpen: bookingEditorOpen,
    mode: bookingEditorMode,
    bookingForm,
    contacts,
    eventTypes,
    onClose: () => setBookingEditorOpen(false),
    onChange: updateBookingForm,
    onSave: saveBookingFromEditor,
  };

  if (isPublicIntakeRoute) {
    return <PublicIntakePage intakeToken={intakeTokenFromPath} />;
  }

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
              <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">Voice-first Client Workspace</h1>
              <p className="mt-1 text-sm text-slate-500">
                Capture clients fast, keep full notes, contact instantly, manage bookings, and export filtered contacts.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6">
          <Sidebar view={view} setView={setView} testsPass={testsPass} />

          <main className="space-y-6">
            {view === "dashboard" && (
              <DashboardPage
                contacts={contacts}
                bookings={bookings}
                tagOptions={tagOptions}
                intakeShare={{
                  isOpen: intakeShareOpen,
                  isLoading: intakeShareLoading,
                  link: intakeProfile
                    ? `${window.location.origin}/intake/${intakeProfile.intake_token}`
                    : "",
                  qrImageUrl: intakeProfile
                    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${window.location.origin}/intake/${intakeProfile.intake_token}`)}`
                    : "",
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
                onEditBooking={handleEditBooking}
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
                bookingEditor={bookingEditorProps}
                bookingEditorScrollKey={bookingEditorScrollKey}
                onPrevDay={() => changeSelectedDate(-1)}
                onToday={goToToday}
                onNextDay={() => changeSelectedDate(1)}
                onPickSlot={handlePickSlot}
                onPickBooking={handlePickBooking}
                onCreateBooking={(slot) => openCreateBookingForCurrentContact(slot)}
                onEditBooking={handleEditBooking}
                onDeleteBooking={handleDeleteBooking}
                onBack={() => setView("contacts")}
                onDelete={handleDeleteContact}
                onChangeField={handleUpdateSelectedContactField}
                onToggleTag={handleToggleTag}
              />
            )}

            {view === "calendar" && (
              <CalendarPage
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                selectedBookingId={selectedBookingId}
                bookings={bookings}
                contacts={contacts}
                bookingEditor={bookingEditorProps}
                bookingEditorScrollKey={bookingEditorScrollKey}
                onPrevDay={() => changeSelectedDate(-1)}
                onToday={goToToday}
                onNextDay={() => changeSelectedDate(1)}
                onPickSlot={handlePickSlot}
                onPickBooking={handlePickBooking}
                onCreateBooking={handleCreateBooking}
                onEditBooking={handleEditBooking}
                onDeleteBooking={handleDeleteBooking}
              />
            )}

            {view === "settings" && (
              <SettingsPage
                statusOptions={statusOptions}
                tagOptions={tagOptions}
                eventTypes={eventTypes}
                settingsMode={settingsMode}
                onAddStatus={addStatus}
                onRemoveStatus={removeStatus}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onAddEventType={addEventType}
                onRemoveEventType={removeEventType}
                onUpdateEventTypeMinutes={updateEventTypeMinutes}
                onSaveSettings={handleSaveSettings}
              />
            )}
            {view === "export" && <ExportPage contacts={contacts} tagOptions={tagOptions} />}
          </main>
        </div>
      </div>
    </div>
  );
}
