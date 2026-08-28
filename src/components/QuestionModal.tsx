"use client";

import { useState, useRef, useEffect } from "react";
import { useThemeIcons } from "./ThemeProvider";
import Dropdown from "./Dropdown";
import { iconOptions, defaultIcons } from "@/iconOptions";
import { Pencil, Trash2, PlusCircle, Check, X } from "lucide-react";

interface Answer {
  value: string | string[];
}

interface Question {
  id: string;
  type: string;
  text: string;
  options?: string[] | null;
  answer?: Answer | null;
}

export interface QuestionModalSubmitPayload {
  type: string;
  text: string;
  options: string[] | null;
  clearAnswer: boolean;
  // when an option is renamed and it matched the existing answer,
  // the corrected answer value to persist alongside the edit
  updatedAnswerValue?: string | string[] | null;
}

interface QuestionModalProps {
  mode: "add" | "edit";
  initialQuestion?: Question | null;
  onSubmit: (payload: QuestionModalSubmitPayload) => Promise<void> | void;
  onClose: () => void;
}

const isMcq = (type: string) => type === "mcq_single" || type === "mcq_multi";

const QuestionModal = ({
  mode,
  initialQuestion,
  onSubmit,
  onClose,
}: QuestionModalProps) => {
  const { icons } = useThemeIcons();
  const EditIcon = iconOptions[icons.edit || defaultIcons.edit] || Pencil;
  const DeleteIcon = iconOptions[icons.delete || defaultIcons.delete] || Trash2;
  const AddIcon =
    iconOptions[icons.addQuestion || defaultIcons.addQuestion] || PlusCircle;

  const [type, setType] = useState(initialQuestion?.type ?? "short_text");
  const [text, setText] = useState(initialQuestion?.text ?? "");
  const [optionsList, setOptionsList] = useState<string[]>(
    initialQuestion?.options ?? [],
  );
  const [tempOption, setTempOption] = useState("");
  const [error, setError] = useState("");

  // In-place option editing
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(
    null,
  );
  const [editingOptionText, setEditingOptionText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Tracks a renamed option's before/after text, so we can sync a matching
  // answer on submit even though the answer itself lives on the server.
  const [answerRenameMap, setAnswerRenameMap] = useState<
    Record<string, string>
  >({});

  // Type-change confirmation (edit mode only, destructive when an answer exists)
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [answerWillClear, setAnswerWillClear] = useState(false);
  const hasExistingAnswer =
    !!initialQuestion?.answer &&
    initialQuestion.answer.value !== undefined &&
    initialQuestion.answer.value !== null &&
    initialQuestion.answer.value !== "";

  useEffect(() => {
    if (editingOptionIndex !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingOptionIndex]);

  const handleTypeSelect = (nextType: string) => {
    if (mode === "edit" && nextType !== type && hasExistingAnswer) {
      // needs confirmation before applying
      setPendingType(nextType);
      return;
    }
    setType(nextType);
    setAnswerWillClear(false);
  };

  const confirmTypeChange = () => {
    if (!pendingType) return;
    setType(pendingType);
    setAnswerWillClear(true);
    // switching type invalidates the old options list if leaving/entering MCQ
    if (!isMcq(pendingType)) {
      setOptionsList([]);
    }
    setPendingType(null);
  };

  const cancelTypeChange = () => {
    setPendingType(null);
  };

  const handleAddOptionToList = () => {
    const trimmed = tempOption.trim();
    if (trimmed && !optionsList.includes(trimmed)) {
      setOptionsList((prev) => [...prev, trimmed]);
      setTempOption("");
    }
  };

  const handleRemoveOptionFromList = (index: number) => {
    setOptionsList((prev) => prev.filter((_, i) => i !== index));
    if (editingOptionIndex === index) setEditingOptionIndex(null);
  };

  const startEditOption = (index: number) => {
    setEditingOptionIndex(index);
    setEditingOptionText(optionsList[index]);
  };

  const cancelEditOption = () => {
    setEditingOptionIndex(null);
    setEditingOptionText("");
  };

  const confirmEditOption = (index: number) => {
    const trimmed = editingOptionText.trim();
    if (!trimmed) {
      cancelEditOption();
      return;
    }
    const oldValue = optionsList[index];
    if (trimmed !== oldValue) {
      setOptionsList((prev) =>
        prev.map((opt, i) => (i === index ? trimmed : opt)),
      );
      // remember rename so we can sync a matching answer on submit
      setAnswerRenameMap((prev) => ({ ...prev, [oldValue]: trimmed }));
    }
    setEditingOptionIndex(null);
    setEditingOptionText("");
  };

  const computeUpdatedAnswerValue = ():
    | string
    | string[]
    | null
    | undefined => {
    if (!initialQuestion?.answer || Object.keys(answerRenameMap).length === 0) {
      return undefined; // nothing to sync
    }
    const current = initialQuestion.answer.value;
    if (Array.isArray(current)) {
      const next = current.map((v) => answerRenameMap[v] ?? v);
      return next;
    }
    if (typeof current === "string" && answerRenameMap[current]) {
      return answerRenameMap[current];
    }
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!text.trim()) {
      setError("Question text is required.");
      return;
    }
    if (isMcq(type) && optionsList.length < 2) {
      setError("Add at least 2 options.");
      return;
    }

    await onSubmit({
      type,
      text: text.trim(),
      options: isMcq(type) ? optionsList : null,
      clearAnswer: answerWillClear,
      updatedAnswerValue: answerWillClear ? null : computeUpdatedAnswerValue(),
    });
  };

  const disableSubmit = isMcq(type) && optionsList.length < 2;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--card-gradient)",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "480px",
        }}
      >
        <h2 style={{ fontWeight: 600, marginBottom: "1rem", fontSize: "1rem" }}>
          {mode === "edit" ? "Edit question" : "Add a question"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Dropdown
            value={type}
            onChange={handleTypeSelect}
            options={[
              { value: "short_text", label: "Short text" },
              { value: "long_text", label: "Long text" },
              { value: "mcq_single", label: "Single Select" },
              { value: "mcq_multi", label: "Multi Select" },
            ]}
            iconSize={16}
            wrapperStyle={{ width: "100%" }}
          />

          {/* Type-change confirmation */}
          {pendingType && (
            <div
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                fontSize: "0.8rem",
                background: "rgba(220,38,38,0.08)",
                color: "var(--text-color)",
              }}
            >
              <p style={{ marginBottom: "0.5rem" }}>
                Changing the question type will clear the existing answer.
                Continue?
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={confirmTypeChange}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    background: "var(--button-gradient)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Yes, change type
                </button>
                <button
                  type="button"
                  onClick={cancelTypeChange}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "0.25rem",
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-color)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {answerWillClear && !pendingType && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626" }}>
              The existing answer will be cleared when you save.
            </p>
          )}

          <input
            type="text"
            placeholder="Question text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            required
          />

          {isMcq(type) && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add an option..."
                  value={tempOption}
                  onChange={(e) => setTempOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOptionToList();
                    }
                  }}
                  className="flex-1 rounded px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-color)",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddOptionToList}
                  className="rounded p-2 flex items-center justify-center"
                  style={{
                    background: "var(--button-gradient)",
                    color: "#fff",
                  }}
                >
                  <AddIcon size={18} />
                </button>
              </div>

              {optionsList.length > 0 && (
                <ul className="space-y-1 max-h-36 overflow-y-auto">
                  {optionsList.map((opt, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded text-sm"
                      style={{
                        background: "rgba(128,128,128,0.05)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-color)",
                      }}
                    >
                      {editingOptionIndex === idx ? (
                        <>
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingOptionText}
                            onChange={(e) =>
                              setEditingOptionText(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                confirmEditOption(idx);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditOption();
                              }
                            }}
                            onBlur={() => confirmEditOption(idx)}
                            className="flex-1 rounded px-2 py-1 text-sm"
                            style={{
                              border: "1px solid var(--border-color)",
                              background: "transparent",
                              color: "var(--text-color)",
                            }}
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              confirmEditOption(idx);
                            }}
                            className="p-1 flex items-center justify-center"
                            style={{ color: "#16a34a" }}
                            title="Confirm"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              cancelEditOption();
                            }}
                            className="p-1 flex items-center justify-center"
                            style={{ color: "var(--muted-text)" }}
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1 }}>{opt}</span>
                          <button
                            type="button"
                            onClick={() => startEditOption(idx)}
                            className="p-1 flex items-center justify-center"
                            style={{ color: "var(--muted-text)" }}
                            title="Edit option"
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionFromList(idx)}
                            className="p-1 flex items-center justify-center"
                            style={{ color: "var(--muted-text)" }}
                            title="Delete option"
                          >
                            <DeleteIcon size={14} />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {optionsList.length < 2 && (
                <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                  Add at least 2 options.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "flex-end",
              paddingTop: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="text-sm rounded px-4 py-2"
              style={{
                border: "1px solid var(--border-color)",
                color: "var(--text-color)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disableSubmit}
              className="text-sm rounded px-4 py-2"
              style={{
                background: "var(--button-gradient)",
                color: "#fff",
                opacity: disableSubmit ? 0.4 : 1,
                cursor: disableSubmit ? "not-allowed" : "pointer",
              }}
            >
              {mode === "edit" ? "Save Changes" : "Add Question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionModal;
