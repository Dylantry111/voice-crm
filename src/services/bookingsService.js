import { supabase } from "../lib/supabase";

const OPTIONAL_BOOKING_FIELDS = [
  "duration_minutes",
  "location_source",
  "location_type",
  "location_name",
  "location_address",
  "notes",
  "status",
];

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

function buildBookingPayload(payload, unsupportedFields = new Set()) {
  const base = {
    user_id: payload?.user_id,
    contact_id: payload?.contact_id,
    event_type: payload?.event_type,
    start_time: payload?.start_time,
    end_time: payload?.end_time,
  };

  for (const field of OPTIONAL_BOOKING_FIELDS) {
    if (!unsupportedFields.has(field) && payload?.[field] !== undefined) {
      base[field] = payload[field];
    }
  }

  return base;
}

function getMissingColumnName(error) {
  const message = error?.message || "";
  const match = message.match(/Could not find the '([^']+)' column of 'bookings'/i);
  return match?.[1] || "";
}

async function insertBookingWithFallback(payload) {
  const unsupportedFields = new Set();

  while (true) {
    const attemptPayload = buildBookingPayload(payload, unsupportedFields);
    const { data, error } = await supabase.from("bookings").insert(attemptPayload).select().single();
    if (!error) return data;

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || unsupportedFields.has(missingColumn)) {
      throw error;
    }
    unsupportedFields.add(missingColumn);
  }
}

async function updateBookingWithFallback(id, userId, patch) {
  const unsupportedFields = new Set();

  while (true) {
    const attemptPatch = buildBookingPayload(patch, unsupportedFields);
    delete attemptPatch.user_id;
    const { data, error } = await supabase
      .from("bookings")
      .update(attemptPatch)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (!error) return data;

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || unsupportedFields.has(missingColumn)) {
      throw error;
    }
    unsupportedFields.add(missingColumn);
  }
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
  return insertBookingWithFallback(safePayload);
}

export async function updateBooking(id, patch) {
  const user = await requireUser();
  const safePatch = { ...patch };
  delete safePatch.user_id;
  return updateBookingWithFallback(id, user.id, safePatch);
}

export async function deleteBooking(id) {
  const user = await requireUser();
  const { error } = await supabase.from("bookings").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  return true;
}
