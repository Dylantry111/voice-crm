import { supabase } from "../lib/supabase";

export async function fetchBookings() {
  const { data, error } = await supabase.from("bookings").select("*").order("start_time", { ascending: true });
  if (error) throw error;
  return data || [];
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
