import { supabase } from "../lib/supabase";

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("Please sign in first");
  return data.user;
}

export async function fetchBookings() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function checkBookingConflict({ userId, startTime, endTime, excludeBookingId = null }) {
  const effectiveUserId = userId || (await requireUser()).id;
  const { data, error } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, event_type, contact_id")
    .eq("user_id", effectiveUserId)
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
  const user = await requireUser();
  const safePayload = {
    ...payload,
    user_id: payload?.user_id || user.id,
  };
  if (safePayload.user_id !== user.id) {
    throw new Error("Cannot create a booking for another user");
  }
  const { data, error } = await supabase.from("bookings").insert(safePayload).select().single();
  if (error) throw error;
  return data;
}

export async function updateBooking(id, patch) {
  const user = await requireUser();
  const safePatch = { ...patch };
  delete safePatch.user_id;
  const { data, error } = await supabase
    .from("bookings")
    .update(safePatch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBooking(id) {
  const user = await requireUser();
  const { error } = await supabase.from("bookings").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  return true;
}
