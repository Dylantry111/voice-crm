import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("export-email invoked");

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "";

    console.log("env loaded", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasResendApiKey: !!resendApiKey,
      hasFromEmail: !!fromEmail,
    });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
    const userError = userResult?.error;

    console.log("user lookup", {
      hasUser: !!user,
      email: user?.email || null,
      userError: userError?.message || null,
    });

    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const body = await req.json();
    const rows = body?.rows;
    const filename = body?.filename || "contacts_export.xlsx";
    const toEmail = body?.toEmail;

    console.log("request body", {
      hasRows: Array.isArray(rows),
      rowCount: Array.isArray(rows) ? rows.length : 0,
      filename,
      toEmail,
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No export rows provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (toEmail !== user.email) {
      return new Response(
        JSON.stringify({ error: "Recipient must match current user email" }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    if (!fromEmail) {
      throw new Error("FROM_EMAIL not configured");
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

    const fileBytes = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });

    console.log("xlsx generated");

    const uint8 = new Uint8Array(fileBytes);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    const resend = new Resend(resendApiKey);

    console.log("sending email");
    const resendResult = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: "Your CRM Export",
      text: "Please find your exported customer list attached.",
      attachments: [
        {
          filename,
          content: base64,
        },
      ],
    });

    console.log("resend response", resendResult);

    return new Response(
      JSON.stringify({ ok: true, resendResult }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("export-email failed", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});