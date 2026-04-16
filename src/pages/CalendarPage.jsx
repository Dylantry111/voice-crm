import React from "react";
import DayTimeline from "../components/bookings/DayTimeline";
import BookingEditor from "../components/bookings/BookingEditor";

export default function CalendarPage({
  selectedDate,
  selectedSlot,
  selectedBookingId,
  bookings,
  contacts,
  bookingEditor,
  onPrevDay,
  onToday,
  onNextDay,
  onPickSlot,
  onPickBooking,
  onCreateBooking,
  onEditBooking,
  onDeleteBooking,
}) {
  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Calendar workflow</div>
            <div className="mt-1 text-sm text-slate-500">
              Select an empty slot, then create a booking in the modal. Tap any existing booking to edit or delete it.
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

      <BookingEditor {...bookingEditor} contacts={contacts} />
    </section>
  );
}
