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
