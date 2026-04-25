import { supabase } from "../lib/supabase";

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

  const intake_token = crypto.randomUUID().replace(/-/g, "");
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
