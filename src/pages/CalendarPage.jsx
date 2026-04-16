import React, { useEffect, useRef } from "react";
import DayTimeline from "../components/bookings/DayTimeline";
import BookingEditor from "../components/bookings/BookingEditor";

export default function CalendarPage({
  selectedDate,
  selectedSlot,
  selectedBookingId,
  bookings,
  contacts,
  bookingEditor,
  bookingEditorScrollKey,
  onPrevDay,
  onToday,
  onNextDay,
  onPickSlot,
  onPickBooking,
  onCreateBooking,
  onEditBooking,
  onDeleteBooking,
}) {
  const formRef = useRef(null);

  useEffect(() => {
    if (formRef.current && bookingEditor.isOpen) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bookingEditorScrollKey, bookingEditor.isOpen]);

  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Calendar workflow</div>
            <div className="mt-1 text-sm text-slate-500">
              Select an empty slot, then click Create Booking. The form below will auto-fill and scroll into view.
            </div>
          </div>
        </div>
      </section>

      <DayTimeline
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        selectedBookingId={selectedBookingId}
        bookings={bookings}
        contacts={contacts}
        onPrevDay={onPrevDay}
        onToday={onToday}
        onNextDay={onNextDay}
        onPickSlot={onPickSlot}
        onPickBooking={onPickBooking}
        onCreateBooking={onCreateBooking}
        onEditBooking={onEditBooking}
        onDeleteBooking={onDeleteBooking}
      />

      <div ref={formRef}>
        <BookingEditor {...bookingEditor} contacts={contacts} />
      </div>
    </section>
  );
}
