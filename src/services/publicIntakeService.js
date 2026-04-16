import { supabase } from "../lib/supabase";

export async function fetchOrCreateMyIntakeProfile(userId) {
  let { data, error } = await supabase
    .from("public_intake_profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const token = crypto.randomUUID().replace(/-/g, "");
  const { data: created, error: insertError } = await supabase
    .from("public_intake_profiles")
    .insert([
      {
        user_id: userId,
        intake_token: token,
        is_enabled: true,
        form_title: "Customer Information",
        intro_text: "Please briefly describe your needs or tell us what kind of help you are looking for.",
      },
    ])
    .select()
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function fetchPublicIntakeProfile(token) {
  const { data, error } = await supabase
    .from("public_intake_profiles")
    .select("*")
    .eq("intake_token", token)
    .eq("is_enabled", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function submitPublicIntake(profile, payload) {
  const { data, error } = await supabase
    .from("contacts")
    .insert([
      {
        user_id: profile.user_id,
        name: payload.name || "",
        phone: payload.phone || "",
        email: payload.email || "",
        address: payload.address || "",
        requirement: "",
        notes: payload.notes || "",
        status: "New",
        tags: ["QR Lead"],
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}
