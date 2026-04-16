import { supabase } from "../lib/supabase";

export async function fetchBookings() {
  const { data, error } = await supabase.from("bookings").select("*").order("start_time", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createBooking(payload) {
  const { data, error } = await supabase.from("bookings").insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateBooking(bookingId, payload) {
  const { data, error } = await supabase.from("bookings").update(payload).eq("id", bookingId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBooking(bookingId) {
  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
  if (error) throw error;
}
