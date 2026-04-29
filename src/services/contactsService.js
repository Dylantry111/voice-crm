import { supabase } from "../lib/supabase";

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("Please sign in first");
  return data.user;
}

export async function fetchContacts() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createContact(payload) {
  const user = await requireUser();
  const safePayload = {
    ...payload,
    user_id: payload?.user_id || user.id,
  };
  if (safePayload.user_id !== user.id) {
    throw new Error("Cannot create a contact for another user");
  }
  const { data, error } = await supabase.from("contacts").insert(safePayload).select().single();
  if (error) throw error;
  return data;
}

export async function updateContact(id, patch) {
  const user = await requireUser();
  const safePatch = { ...patch };
  delete safePatch.user_id;
  const { data, error } = await supabase
    .from("contacts")
    .update(safePatch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
