import React, { useEffect } from "react";
import { usePlayerStore } from "../stores/playerStore";

const Toast: React.FC = () => {
  const error = usePlayerStore((s) => s.error);
  const message = usePlayerStore((s) => s.message);
  const setError = usePlayerStore((s) => s.setError);
  const setMessage = usePlayerStore((s) => s.setMessage);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!error && !message) return null;

  const isError = !!error;
  const text = error || message || "";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: isError
          ? "rgba(248, 113, 113, 0.15)"
          : "rgba(74, 222, 128, 0.15)",
        border: `1px solid ${isError ? "var(--red)" : "var(--green)"}`,
        borderRadius: "var(--radius-sm)",
        padding: "12px 24px",
        color: isError ? "var(--red)" : "var(--green)",
        fontSize: "13px",
        fontFamily: "'Syne', sans-serif",
        fontWeight: 500,
        backdropFilter: "blur(12px)",
        boxShadow: `0 4px 24px ${isError ? "rgba(248, 113, 113, 0.2)" : "rgba(74, 222, 128, 0.2)"}`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        animation: "toastIn 0.3s ease-out",
        maxWidth: "90vw",
      }}
    >
      <span style={{ fontSize: "18px" }}>{isError ? "✕" : "✓"}</span>
      <span>{text}</span>
    </div>
  );
};

export default Toast;
