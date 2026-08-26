"use client";

import React from "react";
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useThemeIcons } from "./ThemeProvider";
import { iconOptions, defaultIcons } from "@/iconOptions";
import QuestionInput from "./QuestionInput";

const typeLabels: Record<string, string> = {
  short_text: "Short text",
  long_text: "Long text",
  mcq_single: "Single Select",
  mcq_multi: "Multi Select",
};

interface Question {
  id: string;
  type: string;
  text: string;
  order: number;
  options?: string[] | null;
  answer?: { value: string | string[] } | null;
  published?: boolean;
}

interface QuestionCardProps {
  question: Question;
  mode: "admin" | "respondent";
  // Admin handlers
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePublish?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  // Respondent props
  value?: string | string[];
  onChange?: (val: string | string[]) => void;
  status?: "saving" | "saved" | null;
}

const QuestionCard = ({
  question,
  mode,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
  value = "",
  onChange,
  status,
}: QuestionCardProps) => {
  const isAdmin = mode === "admin";
  const { type, text, order, options, answer, published } = question;

  const { icons } = useThemeIcons();

  // Resolve icons dynamically
  const EditIcon = iconOptions[icons.edit || defaultIcons.edit] || Pencil;
  const DeleteIcon = iconOptions[icons.delete || defaultIcons.delete] || Trash2;
  const PublishIcon = iconOptions[icons.publish || defaultIcons.publish] || Eye;
  const UnpublishIcon =
    iconOptions[icons.unpublish || defaultIcons.unpublish] || EyeOff;
  const SaveIcon =
    iconOptions[icons.saveIndicator || defaultIcons.saveIndicator] ||
    CheckCircle;

  const answerDisplay = answer?.value
    ? Array.isArray(answer.value)
      ? answer.value.join(", ")
      : answer.value
    : null;

  return (
    <div
      style={
        {
          background: "var(--card-gradient)",
          border: "1px solid var(--border-color)",
          borderRadius: "0.75rem",
          overflow: "hidden",
          viewTransitionName: `card-${question.id}`,
        } as any
      }
    >
      {/* Shared card body */}
      <div style={{ padding: "0.6rem" }}>
        {/* Order + type badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 500,
              color: "var(--muted-text)",
              background: "rgba(128,128,128,0.1)",
              borderRadius: "99px",
              padding: "0.15rem 0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {typeLabels[type] ?? type}
          </span>
          <div style={{ flex: 1 }} />
          {status && (
            <span
              style={{
                fontSize: "0.8rem",
                color: status === "saving" ? "var(--muted-text)" : "#16a34a",
                fontWeight: 500,
                opacity: 0.8,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              {status === "saved" && <SaveIcon size={16} />}
              {status === "saving" ? "Saving..." : "Saved"}
            </span>
          )}
        </div>

        {/* Question text */}
        <p
          style={{
            fontWeight: 600,
            fontSize: "0.9375rem",
            marginBottom: "0.75rem",
            color: "var(--text-color)",
            lineHeight: 1.4,
          }}
        >
          <span style={{ marginRight: "0.4rem", color: "var(--muted-text)" }}>
            Q{order}.
          </span>
          {text}
        </p>

        {/* Input — disabled preview in admin, editable in respondent */}
        <QuestionInput
          id={question.id}
          type={type}
          options={options}
          value={value}
          onChange={onChange}
          disabled={isAdmin}
        />
      </div>

      {/* Admin-only panel */}
      {isAdmin && (
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            padding: "0.8rem",
          }}
        >
          {/* Existing answer */}
          {answerDisplay && (
            <p
              style={{
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
                color: "var(--muted-text)",
                borderBottom: "2px solid var(--border-color)",
              }}
            >
              <span style={{ fontWeight: 500 }}>Answer: </span>
              <span style={{ color: "var(--text-color)" }}>
                {answerDisplay}
              </span>
            </p>
          )}

          {/* Controls row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onMoveUp}
              title="Move up"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.25rem 0.4rem",
                border: "1px solid var(--border-color)",
                borderRadius: "0.25rem",
                background: "transparent",
                color: "var(--text-color)",
                cursor: "pointer",
              }}
            >
              <ArrowUp size={18} />
            </button>
            <button
              onClick={onMoveDown}
              title="Move down"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.25rem 0.4rem",
                border: "1px solid var(--border-color)",
                borderRadius: "0.25rem",
                background: "transparent",
                color: "var(--text-color)",
                cursor: "pointer",
              }}
            >
              <ArrowDown size={18} />
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={onTogglePublish}
              style={{
                fontSize: "0.7rem",
                padding: "0.2rem 0.6rem",
                borderRadius: "99px",
                border: "none",
                background: published
                  ? "rgba(22,163,74,0.12)"
                  : "rgba(107,114,128,0.12)",
                color: published ? "#15803d" : "var(--muted-text)",
                cursor: "pointer",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              {published ? (
                <PublishIcon size={18} />
              ) : (
                <UnpublishIcon size={18} />
              )}
              {published ? "Published" : "Draft"}
            </button>

            <button
              onClick={onEdit}
              title="Edit"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-color)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.2rem 0.4rem",
              }}
            >
              <EditIcon size={18} />
            </button>

            <button
              onClick={onDelete}
              title="Delete"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dc2626",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.2rem 0.4rem",
              }}
            >
              <DeleteIcon size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
