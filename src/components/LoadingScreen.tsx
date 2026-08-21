import React from "react";

const LoadingScreen = () => {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          border: "3px solid var(--border-color, #e5e7eb)",
          borderTop: "3px solid var(--text-color, #111)",
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
        }}
      />
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--muted-color, #6b7280)",
          letterSpacing: "0.05em",
        }}
      >
        Loading
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
};

export default LoadingScreen;
