import { supabase } from "../lib/supabase";

export async function fetchBookings() {
  const { data, error } = await supabase.from("bookings").select("*").order("start_time", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function checkBookingConflict({ userId, startTime, endTime, excludeBookingId = null }) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, event_type, contact_id")
    .eq("user_id", userId)
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (error) throw error;
  const conflicts = (data || []).filter((item) => item.id !== excludeBookingId);
  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

export async function createBooking(payload) {
  const { data, error } = await supabase.from("bookings").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateBooking(id, patch) {
  const { data, error } = await supabase.from("bookings").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBooking(id) {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
  return true;
}
