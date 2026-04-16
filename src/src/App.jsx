import React, { useEffect, useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { DEFAULT_EVENT_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_TAG_OPTIONS } from "./lib/constants";
import { formatSelectedDateLabel, slotToDateRange } from "./lib/dateUtils";
import { smartFill, runSelfTests } from "./lib/contactUtils";
import Sidebar from "./components/layout/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import CapturePage from "./pages/CapturePage";
import ContactsPage from "./pages/ContactsPage";
import ContactDetailPage from "./pages/ContactDetailPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import ExportPage from "./pages/ExportPage";
import { createContact, deleteContactCascade, fetchContacts, tryUpdateContactTags, updateContact } from "./services/contactsService";
import { createBooking, fetchBookings } from "./services/bookingsService";
import { supabase } from "./lib/supabase";

export default function App() {
  const [view, setView] = useState("dashboard");
  const [contacts, setContacts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [query, setQuery] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);

  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [tagOptions, setTagOptions] = useState(DEFAULT_TAG_OPTIONS);
  const [eventTypes, setEventTypes] = useState(DEFAULT_EVENT_TYPES);

  const [voiceInput, setVoiceInput] = useState(
    "John Smith phone 021 123 4567 address 13 Preston Avenue, Mount Albert, Auckland wants living room shutters and one bedroom roller blinds. Needs a measure next week."
  );
  const [draft, setDraft] = useState(() =>
    smartFill(
      "John Smith phone 021 123 4567 address 13 Preston Avenue, Mount Albert, Auckland wants living room shutters and one bedroom roller blinds. Needs a measure next week."
    )
  );

  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState(DEFAULT_EVENT_TYPES[0]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = useState("14:00 - 15:00");

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoadingContacts(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setContacts([]);
      setBookings([]);
      setLoadingContacts(false);
      return;
    }

    try {
      const [contactRows, bookingRows] = await Promise.all([fetchContacts(), fetchBookings()]);
      setContacts(contactRows);
      setBookings(bookingRows);
      if (contactRows.length) setSelectedContact(contactRows[0]);
    } catch (error) {
      console.error("Load failed:", error.message);
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

  function changeSelectedDate(days) {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }

  function goToToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  }

  function openContact(contact) {
    setSelectedContact(contact);
    setView("detail");
  }

  function handleFill() {
    setDraft(smartFill(voiceInput));
  }

  async function handleSaveLead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("请先登录");
      return;
    }

    try {
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

      let bookingRow = null;
      if (selectedSlot) {
        const range = slotToDateRange(selectedDate, selectedSlot);
        if (range) {
          bookingRow = await createBooking({
            user_id: user.id,
            contact_id: newContact.id,
            event_type: selectedEventType.name,
            start_time: range.start.toISOString(),
            end_time: range.end.toISOString(),
          });
          setBookings((prev) => [...prev, bookingRow]);
        }
      }

      const enrichedContact = {
        ...newContact,
        nextBooking: bookingRow
          ? `${formatSelectedDateLabel(selectedDate)} · ${selectedSlot} · ${selectedEventType.name}`
          : "Not booked",
        timeline: [
          {
            type: "created",
            title: "Lead created from voice capture",
            time: new Date().toLocaleString(),
          },
          ...(bookingRow
            ? [
                {
                  type: "booking",
                  title: `Booking scheduled · ${selectedEventType.name}`,
                  time: `${formatSelectedDateLabel(selectedDate)} · ${selectedSlot}`,
                },
              ]
            : []),
        ],
      };

      setContacts((prev) => [enrichedContact, ...prev]);
      setSelectedContact(enrichedContact);
      setView("detail");
    } catch (error) {
      console.error("Save failed:", error.message);
      alert(`保存失败: ${error.message}`);
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
      console.error("Delete failed:", error.message);
      alert(`删除失败: ${error.message}`);
    }
  }

  async function handleUpdateSelectedContactField(field, value) {
    if (!selectedContact) return;
    const updated = { ...selectedContact, [field]: value };
    setSelectedContact(updated);
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

    const payload = {};
    if (["name", "phone", "email", "address", "requirement", "notes", "status"].includes(field)) {
      payload[field] = value;
    }

    if (Object.keys(payload).length) {
      try {
        const saved = await updateContact(selectedContact.id, payload);
        setSelectedContact((prev) => ({ ...prev, ...saved, tags: updated.tags }));
        setContacts((prev) => prev.map((c) => (c.id === saved.id ? { ...c, ...saved, tags: updated.tags } : c)));
      } catch (error) {
        console.error("Update failed:", error.message);
      }
    }
  }

  async function handleToggleTag(tagName) {
    if (!selectedContact) return;
    const current = selectedContact.tags || [];
    const nextTags = current.includes(tagName)
      ? current.filter((t) => t !== tagName)
      : [...current, tagName];

    const updated = { ...selectedContact, tags: nextTags };
    setSelectedContact(updated);
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

    try {
      await tryUpdateContactTags(selectedContact.id, nextTags);
    } catch (error) {
      console.warn("Tags are currently local-only or DB tags column is missing:", error.message);
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

  function addEventType(name) {
    setEventTypes((prev) => [...prev, { id: crypto.randomUUID(), name, minutes: 60, color: "bg-slate-900 text-white" }]);
  }

  function removeEventType(id) {
    setEventTypes((prev) => prev.filter((x) => x.id !== id));
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
              <h1 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">Voice-first Client Workspace</h1>
              <p className="mt-1 text-sm text-slate-500">
                Capture clients fast, keep full notes, contact instantly, and manage bookings without using your personal contacts.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6">
          <Sidebar view={view} setView={setView} testsPass={testsPass} />

          <main className="space-y-6">
            {view === "dashboard" && (
              <DashboardPage contacts={contacts} bookings={bookings} selectedDate={selectedDate} />
            )}

            {view === "capture" && (
              <CapturePage
                voiceInput={voiceInput}
                setVoiceInput={setVoiceInput}
                draft={draft}
                setDraft={setDraft}
                eventTypes={eventTypes}
                selectedEventType={selectedEventType}
                setSelectedEventType={setSelectedEventType}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                bookings={bookings}
                contacts={contacts}
                onPrevDay={() => changeSelectedDate(-1)}
                onToday={goToToday}
                onNextDay={() => changeSelectedDate(1)}
                onPickSlot={setSelectedSlot}
                onHandleFill={handleFill}
                onSaveLead={handleSaveLead}
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
                tagOptions={tagOptions}
              />
            )}

            {view === "detail" && (
              <ContactDetailPage
                contact={selectedContact}
                statusOptions={statusOptions}
                tagOptions={tagOptions}
                onBack={() => setView("contacts")}
                onDelete={handleDeleteContact}
                onChangeField={handleUpdateSelectedContactField}
                onToggleTag={handleToggleTag}
              />
            )}

            {view === "calendar" && (
              <CalendarPage
                selectedEventType={selectedEventType}
                selectedDate={selectedDate}
                eventTypes={eventTypes}
                bookings={bookings}
                contacts={contacts}
                onPrevDay={() => changeSelectedDate(-1)}
                onToday={goToToday}
                onNextDay={() => changeSelectedDate(1)}
                onPickSlot={setSelectedSlot}
              />
            )}

            {view === "settings" && (
              <SettingsPage
                statusOptions={statusOptions}
                tagOptions={tagOptions}
                eventTypes={eventTypes}
                onAddStatus={addStatus}
                onRemoveStatus={removeStatus}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onAddEventType={addEventType}
                onRemoveEventType={removeEventType}
              />
            )}

            {view === "export" && <ExportPage />}
          </main>
        </div>
      </div>
    </div>
  );
}
