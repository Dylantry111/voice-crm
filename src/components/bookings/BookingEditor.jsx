import React from "react";
import DayTimeline from "./DayTimeline";

function LocationChooser({ bookingForm, savedLocations, selectedContact, onChange }) {
  const customerAddress = selectedContact?.address || "";

  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Location</div>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <input
          type="radio"
          name="location_source"
          checked={bookingForm.location_source === "customer"}
          onChange={() => {
            onChange("location_source", "customer");
            onChange("saved_location_id", "");
            onChange("location_name", "Customer Address");
            onChange("location_address", customerAddress);
          }}
          className="mt-1"
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">Customer Address</div>
          <div className="text-xs text-slate-500">{customerAddress || "No customer address available"}</div>
        </div>
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <input
          type="radio"
          name="location_source"
          checked={bookingForm.location_source === "saved"}
          onChange={() => onChange("location_source", "saved")}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">Saved Location</div>
          <select
            value={bookingForm.saved_location_id || ""}
            onChange={(e) => {
              const selected = savedLocations.find((item) => item.id === e.target.value);
              onChange("saved_location_id", e.target.value);
              onChange("location_name", selected?.name || "");
              onChange("location_address", selected?.address || "");
            }}
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
            disabled={bookingForm.location_source !== "saved"}
          >
            <option value="">Select saved location</option>
            {savedLocations.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <div className="mt-2 text-xs text-slate-500">{bookingForm.location_source === "saved" ? (bookingForm.location_address || "No location selected") : "Choose this option to use one of your saved locations."}</div>
        </div>
      </label>
    </div>
  );
}

export default function BookingEditor({
  isOpen,
  mode,
  bookingForm,
  contacts,
  eventTypes,
  savedLocations,
  selectedContact,
  modalVariant,
  bookings,
  selectedDate,
  selectedSlot,
  selectedBookingId,
  onPrevDay,
  onToday,
  onNextDay,
  onDateChange,
  onPickSlot,
  onPickBooking,
  onEditBooking,
  onDeleteBooking,
  onClose,
  onChange,
  onSave,
}) {
  if (!isOpen) return null;

  const customerLocked = modalVariant === "customer-create";
  const isCalendarCreate = modalVariant === "calendar-create";
  const isCustomerCreate = modalVariant === "customer-create";
  const isEdit = mode === "edit";

  const currentCustomer =
    selectedContact ||
    contacts.find((c) => c.id === bookingForm.contact_id) ||
    null;

  const selectedSummary =
    bookingForm.date && bookingForm.slot
      ? `${bookingForm.date} · ${bookingForm.slot}`
      : "No time selected yet";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 md:items-center md:p-4">
      <div className="max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-5xl md:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
          <div>
            <div className="text-lg font-semibold">{isEdit ? "Edit Booking" : "Create Booking"}</div>
            <div className="mt-1 text-sm text-slate-500">
              {isCustomerCreate
                ? "Customer is already selected. Choose an event and pick a suitable time from the calendar."
                : isCalendarCreate
                  ? "Time is already selected. Choose the customer and event details."
                  : "Update the booking details below."}
            </div>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium">
            Close
          </button>
        </div>

        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer</label>
                  {customerLocked ? (
                    <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
                      {currentCustomer?.name || "Selected customer"}
                    </div>
                  ) : (
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
                  )}
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

                {!isCustomerCreate ? (
                  <>
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
                  </>
                ) : null}
              </div>

              {isCustomerCreate ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Selected Time</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{selectedSummary}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Choose a day and click an available time section below.
                  </div>
                </div>
              ) : null}

              <LocationChooser
                bookingForm={bookingForm}
                savedLocations={savedLocations}
                selectedContact={currentCustomer}
                onChange={onChange}
              />

              <div className="flex gap-3">
                <button onClick={onSave} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                  {isEdit ? "Save Changes" : "Create Booking"}
                </button>
                <button onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
                  Cancel
                </button>
              </div>
            </div>

            <div>
              {isCustomerCreate ? (
                <DayTimeline
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                  selectedBookingId={selectedBookingId}
                  bookings={bookings}
                  contacts={contacts}
                  onPrevDay={onPrevDay}
                  onToday={onToday}
                  onNextDay={onNextDay}
                  onDateChange={onDateChange}
                  onPickSlot={onPickSlot}
                  onPickBooking={onPickBooking}
                  onEditBooking={onEditBooking}
                  onDeleteBooking={onDeleteBooking}
                  showAvailability={true}
                  createLabel="Pick Time"
                />
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  {isCalendarCreate
                    ? "The selected date and time already came from the calendar. Complete the customer, event, and location details on the left."
                    : "Use the fields on the left to update this booking. Existing overlaps will be checked when you save."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
