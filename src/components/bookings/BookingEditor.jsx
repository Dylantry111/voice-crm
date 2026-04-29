import React from "react";
import DayTimeline from "./DayTimeline";

function LocationChooser({ bookingForm, savedLocations, selectedContact, onChange }) {
  const customerAddress = selectedContact?.address || "";

  return (
    <div className="booking-section-card booking-location-card">
      <div className="booking-section-kicker">Location</div>
      <div className="booking-section-title">How should this visit be addressed?</div>
      <div className="booking-section-note">Pick the customer address, a saved place, or enter a manual destination.</div>

      <div className="booking-location-options">
        <label className={`booking-location-option ${bookingForm.location_source === "contact_address" ? "is-active" : ""}`}>
          <input
            type="radio"
            name="location_source"
            checked={bookingForm.location_source === "contact_address"}
            onChange={() => {
              onChange("location_source", "contact_address");
              onChange("saved_location_id", "");
              onChange("location_name", "Customer Address");
              onChange("location_address", customerAddress);
            }}
            className="mt-1"
          />
          <div className="booking-location-copy">
            <div className="booking-location-title">Customer Address</div>
            <div className="booking-location-meta">{customerAddress || "No customer address available"}</div>
          </div>
        </label>

        <label className={`booking-location-option ${bookingForm.location_source === "saved_location" ? "is-active" : ""}`}>
          <input
            type="radio"
            name="location_source"
            checked={bookingForm.location_source === "saved_location"}
            onChange={() => onChange("location_source", "saved_location")}
            className="mt-1"
          />
          <div className="booking-location-copy booking-location-copy-full">
            <div className="booking-location-title">Saved Location</div>
            <select
              value={bookingForm.saved_location_id || ""}
              onChange={(e) => {
                const selected = savedLocations.find((item) => item.id === e.target.value);
                onChange("saved_location_id", e.target.value);
                onChange("location_name", selected?.name || "");
                onChange("location_address", selected?.address || "");
              }}
              className="booking-sheet-input mt-2"
              disabled={bookingForm.location_source !== "saved_location"}
            >
              <option value="">Select saved location</option>
              {savedLocations.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <div className="booking-location-meta mt-2">{bookingForm.location_source === "saved_location" ? (bookingForm.location_address || "No location selected") : "Choose this option to use one of your saved locations."}</div>
          </div>
        </label>

        <label className={`booking-location-option ${bookingForm.location_source === "manual" ? "is-active" : ""}`}>
          <input
            type="radio"
            name="location_source"
            checked={bookingForm.location_source === "manual"}
            onChange={() => onChange("location_source", "manual")}
            className="mt-1"
          />
          <div className="booking-location-copy booking-location-copy-full">
            <div className="booking-location-title">Manual Address</div>
            <input
              value={bookingForm.location_name || ""}
              onChange={(e) => onChange("location_name", e.target.value)}
              placeholder="Location name"
              className="booking-sheet-input mt-2"
              disabled={bookingForm.location_source !== "manual"}
            />
            <textarea
              value={bookingForm.location_address || ""}
              onChange={(e) => onChange("location_address", e.target.value)}
              placeholder="Full address"
              className="booking-sheet-textarea mt-2"
              rows={3}
              disabled={bookingForm.location_source !== "manual"}
            />
          </div>
        </label>
      </div>
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
      <div className="booking-sheet max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-5xl md:rounded-3xl">
        <div className="booking-sheet-header flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
          <div>
            <div className="booking-sheet-title text-lg font-semibold">{isEdit ? "Edit Booking" : "Create Booking"}</div>
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

        <div className="booking-sheet-body max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5 md:px-6">
          <div className="booking-sheet-grid">
            <div className="booking-sheet-main">
              <div className="booking-section-card booking-summary-card">
                <div className="booking-section-kicker">Booking Setup</div>
                <div className="booking-section-title">{isEdit ? "Update this booking" : "Create a clean appointment"}</div>
                <div className="booking-section-note">
                  {isCustomerCreate
                    ? "This contact is already selected. Pick the event details, then tap a free time below."
                    : isCalendarCreate
                      ? "The time already came from the calendar. Finish the customer and location details here."
                      : "Adjust the booking details below and save when everything looks right."}
                </div>
                <div className="booking-summary-pills">
                  <span className="booking-summary-pill">{selectedSummary}</span>
                  <span className="booking-summary-pill booking-summary-pill-muted">{bookingForm.duration_minutes || 60} min</span>
                </div>
              </div>

              <div className="booking-section-card">
                <div className="booking-form-grid">
                  <div className="booking-form-field booking-form-field-full">
                    <label className="booking-field-label">Customer</label>
                    {customerLocked ? (
                      <div className="booking-static-field">
                        {currentCustomer?.name || "Selected customer"}
                      </div>
                    ) : (
                      <select
                        value={bookingForm.contact_id || ""}
                        onChange={(e) => onChange("contact_id", e.target.value)}
                        className="booking-sheet-input"
                      >
                        <option value="">Select customer</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="booking-form-field">
                    <label className="booking-field-label">Event Type</label>
                    <select
                      value={bookingForm.event_type || ""}
                      onChange={(e) => onChange("event_type", e.target.value)}
                      className="booking-sheet-input"
                    >
                      {eventTypes.map((item) => (
                        <option key={item.id} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="booking-form-field">
                    <label className="booking-field-label">Duration</label>
                    <div className="booking-static-field booking-static-field-muted">
                      {bookingForm.duration_minutes || 60} minutes
                    </div>
                  </div>

                  {!isCustomerCreate ? (
                    <>
                      <div className="booking-form-field">
                        <label className="booking-field-label">Date</label>
                        <input
                          type="date"
                          value={bookingForm.date || ""}
                          onChange={(e) => onChange("date", e.target.value)}
                          className="booking-sheet-input"
                        />
                      </div>

                      <div className="booking-form-field">
                        <label className="booking-field-label">Start Slot</label>
                        <select
                          value={bookingForm.slot || ""}
                          onChange={(e) => onChange("slot", e.target.value)}
                          className="booking-sheet-input"
                        >
                          <option value="">Select slot</option>
                          {(bookingForm.slotOptions || []).map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : null}

                  <div className="booking-form-field booking-form-field-full">
                    <label className="booking-field-label">Notes</label>
                    <textarea
                      value={bookingForm.notes || ""}
                      onChange={(e) => onChange("notes", e.target.value)}
                      className="booking-sheet-textarea"
                      rows={3}
                      placeholder="Booking notes / customer preference"
                    />
                  </div>
                </div>
              </div>

              {isCustomerCreate ? (
                <div className="booking-section-card booking-highlight-card">
                  <div className="booking-section-kicker">Selected Time</div>
                  <div className="booking-section-title">{selectedSummary}</div>
                  <div className="booking-section-note">
                    Choose a day and tap an available time below to place this booking.
                  </div>
                </div>
              ) : null}

              <LocationChooser
                bookingForm={bookingForm}
                savedLocations={savedLocations}
                selectedContact={currentCustomer}
                onChange={onChange}
              />

              <div className="booking-sheet-actions flex gap-3">
                <button onClick={onSave} className="booking-sheet-primary-btn">
                  {isEdit ? "Save Changes" : "Create Booking"}
                </button>
                <button onClick={onClose} className="booking-sheet-secondary-btn">
                  Cancel
                </button>
              </div>
            </div>

            <div className="booking-sheet-side">
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
