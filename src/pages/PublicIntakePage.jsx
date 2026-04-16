import React, { useEffect, useMemo, useState } from "react";
import { fetchPublicIntakeProfile, submitPublicIntake } from "../services/publicIntakeService";

export default function PublicIntakePage({ intakeToken }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      setErrorMessage("");
      try {
        const data = await fetchPublicIntakeProfile(intakeToken);
        if (!active) return;
        setProfile(data);
      } catch (error) {
        if (!active) return;
        setErrorMessage(error.message || "Failed to load intake page.");
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [intakeToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!profile) return;
    setSubmitState("submitting");
    setErrorMessage("");
    try {
      await submitPublicIntake(profile, form);
      setSubmitState("success");
    } catch (error) {
      setSubmitState("idle");
      setErrorMessage(error.message || "Failed to submit.");
    }
  }

  const introText = useMemo(() => {
    if (profile?.intro_text) return profile.intro_text;
    return "Please briefly describe your needs or tell us what kind of help you are looking for.";
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Loading form...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">This intake page is unavailable.</div>
          <div className="mt-2 text-sm text-slate-500">{errorMessage || "The QR code may be disabled or not configured yet."}</div>
        </div>
      </div>
    );
  }

  if (submitState === "success") {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center">
          <div className="text-3xl font-semibold text-slate-900">Thank you</div>
          <div className="mt-3 text-sm text-slate-500">
            Your information has been submitted successfully.
          </div>
          <div className="mt-2 text-sm text-slate-500">
            We will contact you soon.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-2xl font-semibold text-slate-900">{profile.form_title || "Customer Information"}</div>
          <div className="mt-2 text-sm text-slate-500">
            Please fill in your contact details below.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Note</label>
              <div className="mt-1 mb-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                {introText}
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-[140px] w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none"
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-5">
            <button
              type="submit"
              disabled={submitState === "submitting"}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitState === "submitting" ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
