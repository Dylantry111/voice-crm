import { supabase } from "../lib/supabase";

export async function fetchSavedLocations() {
  const { data, error } = await supabase
    .from("saved_locations")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createSavedLocation(payload) {
  const { data, error } = await supabase
    .from("saved_locations")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSavedLocation(locationId) {
  const { error } = await supabase
    .from("saved_locations")
    .delete()
    .eq("id", locationId);
  if (error) throw error;
}
