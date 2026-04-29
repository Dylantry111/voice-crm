import { supabase } from "../lib/supabase";

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export async function fetchOrCreateMyIntakeProfile() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData?.user;
  if (!user) return null;

  const { data: existing, error: selectError } = await supabase
    .from("public_intake_profiles")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const intake_token = randomToken();
  const { data, error } = await supabase
    .from("public_intake_profiles")
    .insert({
      user_id: user.id,
      intake_token,
      is_enabled: true,
      form_title: "Customer Information",
      intro_text: "Please briefly describe your needs or tell us what kind of help you are looking for.",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMyIntakeProfile(patch) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData?.user;
  if (!user) throw new Error("Please sign in first");

  const { data, error } = await supabase
    .from("public_intake_profiles")
    .update(patch)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchPublicIntakeProfileByToken(token) {
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

export async function submitPublicIntake({ token, form }) {
  const profile = await fetchPublicIntakeProfileByToken(token);
  if (!profile) throw new Error("Intake link is invalid or disabled");

  const preferredBookingNotes = form.preferred_booking_notes || "";
  const mergedNotes = [form.notes, preferredBookingNotes ? `Booking preference: ${preferredBookingNotes}` : ""]
    .filter(Boolean)
    .join("\n\n");

  const payload = {
    user_id: profile.user_id,
    name: form.name || "New Lead",
    phone: form.phone || "",
    email: form.email || "",
    address: form.address || "",
    requirement: form.requirement || "Public intake submission",
    notes: mergedNotes || form.requirement || "Submitted via public intake",
    status: "New Lead",
    tags: ["Public Intake", "Needs Scheduling"],
    source: "public_intake",
  };

  const { data, error } = await supabase.from("contacts").insert(payload).select().single();
  if (error) throw error;
  return { profile, contact: data };
}
