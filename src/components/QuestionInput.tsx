"use client";

import React from "react";
import { iconOptions, selectionIcons } from "@/iconOptions";

export interface QuestionInputProps {
  id: string;
  type: string;
  options?: string[] | null;
  value?: string | string[];
  onChange?: (val: string | string[]) => void;
  disabled?: boolean;
}

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border-color)",
  borderRadius: "0.375rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  background: "transparent",
  color: "var(--text-color)",
  boxSizing: "border-box",
  outline: "none",
};

const QuestionInput = ({
  id,
  type,
  options,
  value = "",
  onChange,
  disabled = false,
}: QuestionInputProps) => {
  if (type === "short_text") {
    return (
      <input
        type="text"
        style={{
          ...baseInputStyle,
          cursor: disabled ? "default" : "text",
          opacity: disabled ? 0.6 : 1,
        }}
        placeholder="Short answer..."
        disabled={disabled}
        value={disabled ? "" : (value as string)}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  if (type === "long_text") {
    return (
      <textarea
        style={{
          ...baseInputStyle,
          minHeight: "80px",
          resize: "vertical",
          fontFamily: "inherit",
          cursor: disabled ? "default" : "text",
          opacity: disabled ? 0.6 : 1,
        }}
        placeholder="Long answer..."
        disabled={disabled}
        value={disabled ? "" : (value as string)}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  if ((type === "mcq_single" || type === "mcq_multi") && options?.length) {
    const isMulti = type === "mcq_multi";
    const selected = Array.isArray(value)
      ? value
      : value
        ? [value as string]
        : [];

    const UncheckedIcon =
      iconOptions[selectionIcons[isMulti ? "checkbox" : "radio"]];
    const CheckedIcon =
      iconOptions[
        selectionIcons[isMulti ? "checkboxSelected" : "radioSelected"]
      ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {options.map((opt, idx) => {
          const inputId = `${id}-opt-${idx}`;
          const isChecked = disabled ? false : selected.includes(opt);
          const Icon = isChecked ? CheckedIcon : UncheckedIcon;

          return (
            <label
              key={idx}
              htmlFor={inputId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                color: "var(--text-color)",
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.6 : 1,
                position: "relative",
              }}
            >
              <input
                id={inputId}
                type={isMulti ? "checkbox" : "radio"}
                name={`q-${id}`}
                value={opt}
                disabled={disabled}
                checked={isChecked}
                onChange={() => {
                  if (disabled) return;
                  if (isMulti) {
                    const arr = Array.isArray(value) ? (value as string[]) : [];
                    const next = arr.includes(opt)
                      ? arr.filter((v) => v !== opt)
                      : [...arr, opt];
                    onChange?.(next);
                  } else {
                    onChange?.(opt);
                  }
                }}
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: "1.1rem",
                  height: "1.1rem",
                  margin: 0,
                  cursor: disabled ? "default" : "pointer",
                }}
              />
              <Icon
                size={26}
                style={{ color: "var(--text-color)", flexShrink: 0 }}
              />
              {opt}
            </label>
          );
        })}
      </div>
    );
  }

  return null;
};

export default QuestionInput;
