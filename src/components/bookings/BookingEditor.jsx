import React from "react";

export default function BookingEditor({
  isOpen,
  mode,
  bookingForm,
  contacts,
  eventTypes,
  onClose,
  onChange,
  onSave,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 md:items-center md:p-4">
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl md:max-w-3xl md:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{mode === "edit" ? "Edit Booking" : "Create Booking"}</div>
            <div className="mt-1 text-sm text-slate-500">
              Customer, date and time should already be filled from the selected calendar slot.
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer</label>
            <select
              value={bookingForm.contact_id || ""}
              onChange={(e) => onChange("contact_id", e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
            >
              <option value="">Select customer</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Event Type</label>
            <select
              value={bookingForm.event_type || ""}
              onChange={(e) => onChange("event_type", e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
            >
              {eventTypes.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date</label>
            <input
              type="date"
              value={bookingForm.date || ""}
              onChange={(e) => onChange("date", e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Start Slot</label>
            <select
              value={bookingForm.slot || ""}
              onChange={(e) => onChange("slot", e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
            >
              <option value="">Select slot</option>
              {(bookingForm.slotOptions || []).map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            {mode === "edit" ? "Save Changes" : "Create Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
