import React from "react";

const InvalidTokenScreen = () => {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(145deg, #FDF6F0, #F0E2D0, #E8D0B8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "360px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "2.25rem",
            marginBottom: "1.25rem",
            opacity: 0.5,
          }}
        >
          🔗
        </div>

        <h1
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontSize: "clamp(1.25rem, 5vw, 1.6rem)",
            fontWeight: 600,
            color: "#2B2320",
            marginBottom: "0.75rem",
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          This link isn&apos;t valid.
        </h1>

        <p
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontSize: "clamp(0.875rem, 3.5vw, 1rem)",
            fontWeight: 400,
            color: "#7A6F68",
            lineHeight: 1.6,
          }}
        >
          Check that you&apos;ve copied the full URL correctly.
        </p>
      </div>
    </main>
  );
};

export default InvalidTokenScreen;
