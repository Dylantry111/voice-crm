import { supabase } from "../lib/supabase";

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("Please sign in first");
  return data.user;
}

export async function fetchSavedLocations() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("saved_locations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
