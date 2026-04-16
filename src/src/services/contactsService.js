import { supabase } from "../lib/supabase";
import { mapContactRow } from "../lib/contactUtils";

export async function fetchContacts() {
  const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapContactRow);
}

export async function createContact(payload) {
  const { data, error } = await supabase.from("contacts").insert([payload]).select().single();
  if (error) throw error;
  return mapContactRow(data);
}

export async function updateContact(contactId, payload) {
  const { data, error } = await supabase.from("contacts").update(payload).eq("id", contactId).select().single();
  if (error) throw error;
  return mapContactRow(data);
}

export async function deleteContactCascade(contactId) {
  const bookingDelete = await supabase.from("bookings").delete().eq("contact_id", contactId);
  if (bookingDelete.error) throw bookingDelete.error;

  const contactDelete = await supabase.from("contacts").delete().eq("id", contactId);
  if (contactDelete.error) throw contactDelete.error;
}

export async function tryUpdateContactTags(contactId, tags) {
  const result = await supabase.from("contacts").update({ tags }).eq("id", contactId).select().single();
  return result;
}
