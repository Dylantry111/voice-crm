import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AuthGate from "./AuthGate";
import "./index.css";

function Root() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isPublicIntakeRoute = pathname.startsWith("/intake/");

  if (isPublicIntakeRoute) {
    return <App />;
  }

  return (
    <AuthGate>
      <App />
    </AuthGate>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
