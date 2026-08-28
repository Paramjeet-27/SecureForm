import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[] | string[];
  className?: string;
  style?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  disabled?: boolean;
  iconSize?: number;
  panelBg?: string;
}

export default function Dropdown({
  value,
  onChange,
  options,
  className = "",
  style = {},
  wrapperStyle = {},
  disabled = false,
  iconSize = 16,
  panelBg,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );

  const selected = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", ...wrapperStyle }}
      className={className}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded px-3 py-2 text-sm flex items-center justify-between gap-2"
        style={{
          background: open
            ? "color-mix(in srgb, var(--text-color) 12%, transparent)"
            : "color-mix(in srgb, var(--text-color) 6%, transparent)",
          color: "var(--text-color)",
          border: `1px solid ${open ? "var(--text-color)" : "var(--border-color)"}`,
          outline: "none",
          boxShadow: open
            ? "0 0 0 3px color-mix(in srgb, var(--text-color) 10%, transparent)"
            : "none",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          transition:
            "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
          ...style,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected?.label ?? ""}
        </span>
        <ChevronDown
          size={iconSize}
          style={{
            flexShrink: 0,
            color: open ? "var(--text-color)" : "var(--muted-text)",
            transform: `rotate(${open ? 180 : 0}deg)`,
            transition: "transform 150ms ease, color 150ms ease",
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            maxHeight: "16rem",
            overflowY: "auto",
            borderRadius: "0.375rem",
            border: "1px solid var(--border-color)",
            background: panelBg ?? "var(--border-color)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            padding: "0.25rem",
          }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="text-sm px-3 py-2 rounded flex items-center justify-between gap-2 cursor-pointer"
                style={{
                  color: "var(--text-color)",
                  background: isSelected
                    ? "color-mix(in srgb, var(--text-color) 12%, transparent)"
                    : "transparent",
                  transition: "background-color 120ms ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "color-mix(in srgb, var(--text-color) 18%, transparent)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = isSelected
                    ? "color-mix(in srgb, var(--text-color) 12%, transparent)"
                    : "transparent")
                }
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.label}
                </span>
                {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
