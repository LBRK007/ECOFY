import { useState, useCallback } from "react";

/* -----------------------------------------------
   Toast context hook — import useToast anywhere
   Usage:
     const { toast, ToastContainer } = useToast();
     toast("Order placed! 🌿", "success");
     ...
     return <> <ToastContainer /> ... </>
----------------------------------------------- */

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const COLORS = {
    success: { bg: "#4CAF50", icon: "✓" },
    error:   { bg: "#f44336", icon: "✕" },
    info:    { bg: "#2196F3", icon: "ℹ" },
    warning: { bg: "#ff9800", icon: "⚠" },
  };

  const ToastContainer = () => (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
      }}
    >
      {toasts.map(({ id, message, type }) => {
        const c = COLORS[type] || COLORS.info;
        return (
          <div
            key={id}
            style={{
              background: c.bg,
              color: "white",
              padding: "12px 18px",
              borderRadius: "10px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minWidth: "220px",
              maxWidth: "360px",
              animation: "toastIn 0.3s ease",
            }}
          >
            <span style={{ fontWeight: "bold", fontSize: "16px" }}>{c.icon}</span>
            {message}
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  return { toast, ToastContainer };
}