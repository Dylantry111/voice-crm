import { FIELD_LIMITS } from "../lib/constants";
import React from "react";
import { ArrowLeft, Phone, MessageCircle, MapPin, Trash2, CalendarPlus } from "lucide-react";
import { StatusBadge } from "../components/common/Badges";
import DayTimeline from "../components/bookings/DayTimeline";
import { formatSelectedDateLabel, formatSlotTimeRange, getNextBookingForContact } from "../lib/dateUtils";

export default function ContactDetailPage({
  contact,
  statusOptions,
  tagOptions,
  bookings,
  contacts,
  selectedDate,
  selectedSlot,
  selectedBookingId,
  onPrevDay,
  onToday,
  onNextDay,
  onPickSlot,
  onPickBooking,
  onEditBooking,
  onDeleteBooking,
  onBack,
  onDelete,
  onChangeField,
  onToggleTag,
  onAddBooking,
}) {
  if (!contact) return null;

  const nextBooking = getNextBookingForContact(contact.id, bookings);
  const nextBookingLabel = nextBooking
    ? `${formatSelectedDateLabel(nextBooking.start_time)} · ${formatSlotTimeRange(nextBooking.start_time, nextBooking.end_time)} · ${nextBooking.event_type}`
    : "Not booked";

  const contactBookings = bookings.filter((b) => b.contact_id === contact.id);

  return (
    <>
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to contacts
        </button>

        <div className="flex flex-wrap gap-2">
          <button onClick={onAddBooking} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
            <CalendarPlus className="h-4 w-4" />
            Add Booking
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium">
            <Phone className="h-4 w-4" />
            Call
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-2xl font-semibold text-slate-900">{contact.name}</h2>
              <StatusBadge value={contact.status} statusOptions={statusOptions} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
                <input maxLength={FIELD_LIMITS.contactName} value={contact.name || ""} onChange={(e) => onChangeField("name", e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</label>
                <input maxLength={FIELD_LIMITS.phone} value={contact.phone || ""} onChange={(e) => onChangeField("phone", e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
                <input maxLength={FIELD_LIMITS.email} value={contact.email || ""} onChange={(e) => onChangeField("email", e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
                <select value={contact.status || "New Lead"} onChange={(e) => onChangeField("status", e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none">
                  {statusOptions.map((opt) => (
                    <option key={opt.id} value={opt.name}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</label>
                <input maxLength={FIELD_LIMITS.address} value={contact.address || ""} onChange={(e) => onChangeField("address", e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Requirement</label>
                <input maxLength={FIELD_LIMITS.requirement} value={contact.requirement || ""} onChange={(e) => onChangeField("requirement", e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</label>
                <textarea maxLength={FIELD_LIMITS.notes} value={contact.notes || ""} onChange={(e) => onChangeField("notes", e.target.value)} className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none" />
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Tags</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tagOptions.map((tag) => {
                  const active = (contact.tags || []).includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onToggleTag(tag.name)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${active ? tag.color : "border border-slate-200 bg-white text-slate-600"}`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[360px] xl:grid-cols-1">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Next booking</div>
              <div className="mt-2 text-sm font-semibold text-emerald-900">{nextBookingLabel}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Last contact</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{contact.lastContact || "Just now"}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Address
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{contact.address || "Not provided"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold">Booked Times</div>
          <div className="mt-1 text-sm text-slate-500">
            Review this customer's existing appointments. Use Add Booking to schedule a new one.
          </div>
        </div>

        <DayTimeline
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          selectedBookingId={selectedBookingId}
          bookings={contactBookings}
          contacts={contacts}
          onPrevDay={onPrevDay}
          onToday={onToday}
          onNextDay={onNextDay}
          onPickBooking={onPickBooking}
          onEditBooking={onEditBooking}
          onDeleteBooking={onDeleteBooking}
          showAvailability={false}
        />
      </section>
    </>
  );
}
