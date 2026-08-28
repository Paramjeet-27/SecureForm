import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  id?: string;
  required?: boolean;
  minLength?: number;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = "",
  className = "",
  style = {},
  disabled = false,
  id,
  required = false,
  minLength,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        minLength={minLength}
        className={`w-full rounded px-3 py-2 text-sm pr-10 ${className}`}
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          color: "var(--text-color)",
          border: "1px solid var(--border-color)",
          outline: "none",
          ...style,
        }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        disabled={disabled}
        style={{
          position: "absolute",
          right: "0.75rem",
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--muted-text)",
          padding: 0,
          display: "flex",
          alignItems: "center",
          opacity: disabled ? 0.5 : 1,
        }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
