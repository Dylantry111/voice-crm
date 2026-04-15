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

      setMessage("注册成功。请检查邮箱验证链接，或直接尝试登录。");
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

    setMessage("登录成功");
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
            {mode === "login" ? "登录你的账号" : "创建一个新账号"}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <input
              type="email"
              placeholder="邮箱"
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
              placeholder="密码"
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
              {mode === "login" ? "登录" : "注册"}
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
            {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
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
          当前登录：{session.user.email}
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
          退出登录
        </button>
      </div>
      {children}
    </div>
  );
}