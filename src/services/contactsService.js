import { supabase } from "../lib/supabase";

export async function fetchContacts() {
  const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createContact(payload) {
  const { data, error } = await supabase.from("contacts").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateContact(id, patch) {
  const { data, error } = await supabase.from("contacts").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
