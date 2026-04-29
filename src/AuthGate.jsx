import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Sign-up successful. Please check your email for the verification link, or try logging in directly.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Signed in successfully");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Voice CRM
          </h1>
          <p style={{ color: "#475569", marginBottom: 20 }}>
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                height: 44,
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                padding: "0 12px",
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                height: 44,
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                padding: "0 12px",
              }}
            />

            <button
              type="submit"
              style={{
                height: 44,
                borderRadius: 12,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {mode === "login" ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <button
            onClick={() =>
              setMode((prev) => (prev === "login" ? "signup" : "login"))
            }
            style={{
              marginTop: 12,
              background: "transparent",
              border: "none",
              color: "#2563eb",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {mode === "login" ? "No account? Sign up" : "Already have an account? Sign in"}
          </button>

          {message ? (
            <div style={{ marginTop: 16, color: "#475569" }}>{message}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #e2e8f0",
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 14, color: "#475569" }}>
          Signed in as: {session.user.email}
        </div>
        <button
          onClick={handleLogout}
          style={{
            height: 36,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            padding: "0 12px",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
      {children}
    </div>
  );
}