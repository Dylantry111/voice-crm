import { supabase } from "../lib/supabase";

export async function fetchSavedLocations() {
  const { data, error } = await supabase.from("saved_locations").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
