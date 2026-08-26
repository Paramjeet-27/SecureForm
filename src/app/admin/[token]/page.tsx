"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import ThemeProvider, { useThemeIcons } from "@/components/ThemeProvider";
import { PlusCircle, Trash2, LogOut, Eye, EyeOff } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import InvalidTokenScreen from "@/components/InvalidTokenScreen";
import { themes, ThemeKey } from "@/themes";
import { iconOptions, defaultIcons, IconName } from "@/iconOptions";
import QuestionCard from "@/components/QuestionCard";
import QuestionModal, {
  QuestionModalSubmitPayload,
} from "@/components/QuestionModal";

type Status = "loading" | "invalidToken" | "needsSetup" | "needsLogin";

export default function AdminPage() {
  const params = useParams();
  const token = params.token as string;

  const { icons } = useThemeIcons();
  const LogoutIcon = iconOptions[icons.logout || defaultIcons.logout] || LogOut;
  const AddQuestionIcon =
    iconOptions[icons.addQuestion || defaultIcons.addQuestion] || PlusCircle;
  const DeleteIcon = iconOptions[icons.delete || defaultIcons.delete] || Trash2;

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  // Setup form state
  const [adminPassphrase, setAdminPassphrase] = useState("");
  const [respondentPassphrase, setRespondentPassphrase] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showAdminPassphrase, setShowAdminPassphrase] = useState(false);
  const [showRespondentPassphrase, setShowRespondentPassphrase] =
    useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [questions, setQuestions] = useState<Record<string, any> | null>(null);

  const updateQuestionsState = (
    fn: (prev: Record<string, any> | null) => Record<string, any> | null,
  ) => {
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() => {
        setQuestions(fn);
      });
    } else {
      setQuestions(fn);
    }
  };

  // theme states
  const [activeTab, setActiveTab] = useState<"questions" | "settings">(
    "questions",
  );
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("calm");
  const [angle, setAngle] = useState<number>(135);
  const [iconSettings, setIconSettings] = useState<Record<string, IconName>>(
    {},
  );
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{
    id: string;
    type: string;
    text: string;
    options: string[] | null;
    answer?: { value: string | string[] } | null;
  } | null>(null);

  // Change respondandt password
  const [showResetForm, setShowResetForm] = useState(false);
  const [currentAdminPassphrase, setCurrentAdminPassphrase] = useState("");
  const [newRespondentPassphrase, setNewRespondentPassphrase] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const loadThemeSettings = async () => {
    const res = await fetch("/api/admin/theme");
    const data = await res.json();
    setSelectedTheme(data.theme);
    setAngle(
      data.gradientAngle ?? themes[data.theme as ThemeKey].background.angle,
    );
    setIconSettings(data.icons);
  };

  useEffect(() => {
    const check = async () => {
      const verifyRes = await fetch("/api/admin/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.valid) {
        setStatus("invalidToken");
        return;
      }

      // Check if we already have a valid session before asking for passphrase again
      const sessionRes = await fetch("/api/admin/session-check");
      const sessionData = await sessionRes.json();

      if (sessionData.valid) {
        const dataRes = await fetch("/api/admin/data");
        const dataJson = await dataRes.json();
        setQuestions(dataJson.questions);
        await loadThemeSettings();
        setLoggedIn(true);
        setStatus("needsLogin"); // status doesn't matter once loggedIn is true, but keep consistent
        return;
      }

      const statusRes = await fetch("/api/status");
      const statusData = await statusRes.json();
      setStatus(statusData.initialized ? "needsLogin" : "needsSetup");
    };

    check().catch(() => setError("Could not reach server."));
  }, [token]);

  const saveThemeSettings = async (updates: {
    theme?: ThemeKey;
    gradientAngle?: number;
    icons?: Record<string, IconName>;
  }) => {
    const res = await fetch("/api/admin/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 1500);
      // Reload so the new theme actually applies (ThemeProvider fetches on mount)
      window.location.reload();
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPassphrase, respondentPassphrase }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Setup failed.");
      return;
    }

    setStatus("needsLogin");
    setAdminPassphrase("");
    setRespondentPassphrase("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, passphrase }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed.");
      return;
    }

    setLoggedIn(true);
    setPassphrase("");

    // fetch data now that we're logged in
    const dataRes = await fetch("/api/admin/data");
    const dataJson = await dataRes.json();
    setQuestions(dataJson.questions);
    await loadThemeSettings();
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    const res = await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates: { published: !current } }),
    });
    const data = await res.json();
    if (res.ok) {
      updateQuestionsState((prev) => ({ ...prev, [id]: data.question }));
    } else {
      alert(data.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question and its answer permanently?")) return;

    const res = await fetch("/api/admin/questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) {
      updateQuestionsState((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      alert(data.error);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingQuestion(null);
  };

  const openEditModal = (id: string, q: any) => {
    setEditingQuestion({
      id,
      type: q.type,
      text: q.text,
      options: q.options ?? null,
      answer: q.answer ?? null,
    });
    setShowAddModal(true);
  };

  const handleModalSubmit = async (payload: QuestionModalSubmitPayload) => {
    if (editingQuestion) {
      const updates: any = {
        type: payload.type,
        text: payload.text,
        options: payload.options,
      };
      if (payload.clearAnswer) {
        updates.answer = null;
      } else if (payload.updatedAnswerValue !== undefined) {
        updates.answer = { value: payload.updatedAnswerValue };
      }

      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingQuestion.id,
          updates: {
            type: payload.type,
            text: payload.text,
            options: payload.options,
          },
          clearAnswer: payload.clearAnswer,
          renamedAnswerValue:
            !payload.clearAnswer && payload.updatedAnswerValue !== undefined
              ? payload.updatedAnswerValue
              : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        updateQuestionsState((prev) => ({
          ...prev,
          [editingQuestion.id]: data.question,
        }));
        closeModal();
      } else {
        alert(data.error || "Failed to update question.");
      }
    } else {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payload.type,
          text: payload.text,
          options: payload.options ?? undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        updateQuestionsState((prev) => ({ ...prev, [data.id]: data.question }));
        closeModal();
      } else {
        alert(data.error || "Failed to add question.");
      }
    }
  };

  const moveQuestion = async (id: string, direction: "up" | "down") => {
    if (!questions) return;

    const sorted = Object.entries(questions).sort(
      (a: any, b: any) => a[1].order - b[1].order,
    );
    const index = sorted.findIndex(([qid]) => qid === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= sorted.length) return; // already at edge

    const [currentId, currentQ] = sorted[index];
    const [swapId, swapQ] = sorted[swapIndex];

    // Swap their order values via two PATCH calls
    await Promise.all([
      fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentId,
          updates: { order: swapQ.order },
        }),
      }),
      fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: swapId,
          updates: { order: currentQ.order },
        }),
      }),
    ]);

    updateQuestionsState((prev) =>
      prev
        ? {
            ...prev,
            [currentId]: { ...prev[currentId], order: swapQ.order },
            [swapId]: { ...prev[swapId], order: currentQ.order },
          }
        : prev,
    );
  };

  const handleResetRespondentPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess(false);

    const res = await fetch("/api/admin/reset-respondent-passphrase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentAdminPassphrase,
        newPassphrase: newRespondentPassphrase,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setResetError(data.error || "Reset failed.");
      return;
    }

    setResetSuccess(true);
    setCurrentAdminPassphrase("");
    setNewRespondentPassphrase("");
    setShowResetForm(false);
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setLoggedIn(false);
    setQuestions(null);
    setStatus("needsLogin");
  };

  if (status === "loading") {
    return (
      <ThemeProvider>
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  if (status === "invalidToken") {
    return <InvalidTokenScreen />;
  }

  if (status === "needsSetup") {
    return (
      <ThemeProvider>
        <main className="max-w-md mx-auto mt-16 p-6">
          <h1 className="text-xl font-semibold mb-2">First-time setup</h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted-text)" }}>
            Set a password for yourself and one for the person filling out this
            questionnaire.
          </p>
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Your password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showAdminPassphrase ? "text" : "password"}
                  value={adminPassphrase}
                  onChange={(e) => setAdminPassphrase(e.target.value)}
                  className="w-full rounded px-3 py-2 pr-10"
                  style={{
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-color)",
                  }}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassphrase(!showAdminPassphrase)}
                  style={{
                    position: "absolute",
                    right: "0.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showAdminPassphrase ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Respondent password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showRespondentPassphrase ? "text" : "password"}
                  value={respondentPassphrase}
                  onChange={(e) => setRespondentPassphrase(e.target.value)}
                  className="w-full rounded px-3 py-2 pr-10"
                  style={{
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-color)",
                  }}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowRespondentPassphrase(!showRespondentPassphrase)
                  }
                  style={{
                    position: "absolute",
                    right: "0.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showRespondentPassphrase ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full rounded py-2"
              style={{ background: "var(--button-gradient)", color: "#fff" }}
            >
              Create
            </button>
          </form>
          <ul
            className="mt-4 space-y-1 text-xs list-disc list-inside"
            style={{ color: "var(--muted-text)" }}
          >
            <li>Both passwords must be at least 8 characters</li>
            <li>The two passwords must be different</li>
            <li>Passwords are hashed and never stored as plain text</li>
            <li>Your password cannot be recovered if lost</li>
            <li>This setup only runs once</li>
          </ul>
        </main>
      </ThemeProvider>
    );
  }

  // status === "needsLogin" or "loggedIn"
  if (loggedIn) {
    return (
      <ThemeProvider>
        <main
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            padding: "0.75rem",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* Header & Tabs wrapper — flexShrink:0 keeps it pinned */}
          <div style={{ flexShrink: 0 }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                Admin Dashboard
              </h1>
              <button
                onClick={handleLogout}
                className="text-sm rounded px-3 py-1.5"
                style={{
                  background: "var(--button-gradient)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <LogoutIcon size={14} />
                Logout
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1.5rem",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <button
                onClick={() => setActiveTab("questions")}
                className={`pb-2 px-1 ${
                  activeTab === "questions"
                    ? "border-b-2 font-medium"
                    : "opacity-60"
                }`}
                style={
                  activeTab === "questions"
                    ? { borderColor: "var(--text-color)" }
                    : {}
                }
              >
                Questions
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`pb-2 px-1 ${
                  activeTab === "settings"
                    ? "border-b-2 font-medium"
                    : "opacity-60"
                }`}
                style={
                  activeTab === "settings"
                    ? { borderColor: "var(--text-color)" }
                    : {}
                }
              >
                Settings
              </button>
            </div>
          </div>

          {/* Questions Tab */}
          {activeTab === "questions" && (
            <>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  paddingBottom: "5rem",
                }}
              >
                <div className="space-y-3">
                  {questions &&
                    Object.entries(questions)
                      .sort((a, b) => a[1].order - b[1].order)
                      .map(([id, q]: [string, any]) => (
                        <QuestionCard
                          key={id}
                          question={{ id, ...q }}
                          mode="admin"
                          onEdit={() => openEditModal(id, q)}
                          onDelete={() => handleDelete(id)}
                          onTogglePublish={() =>
                            handleTogglePublish(id, q.published)
                          }
                          onMoveUp={() => moveQuestion(id, "up")}
                          onMoveDown={() => moveQuestion(id, "down")}
                        />
                      ))}
                </div>
              </div>

              {/* FAB */}
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setShowAddModal(true);
                }}
                title="Add question"
                style={{
                  position: "fixed",
                  bottom: "2rem",
                  right: "2rem",
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "var(--button-gradient)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <AddQuestionIcon size={24} />
              </button>

              {/* Add Question Modal */}
              {showAddModal && (
                <QuestionModal
                  mode={editingQuestion ? "edit" : "add"}
                  initialQuestion={editingQuestion}
                  onSubmit={handleModalSubmit}
                  onClose={closeModal}
                />
              )}
            </>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                paddingBottom: "2rem",
              }}
            >
              <div className="space-y-8">
                {/* Theme picker */}
                <div>
                  <h2 className="font-medium mb-3">Theme</h2>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {Object.entries(themes).map(([key, theme]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedTheme(key as ThemeKey);
                          saveThemeSettings({ theme: key as ThemeKey });
                        }}
                        className="rounded p-4 w-26 text-left border-2 shrink-0"
                        style={{
                          background: `linear-gradient(${theme.background.angle}deg, ${theme.background.colors.join(",")})`,
                          borderColor:
                            selectedTheme === key
                              ? "var(--text-color)"
                              : "transparent",
                          color: theme.text,
                        }}
                      >
                        <span className="font-medium text-sm">
                          {theme.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Angle slider */}
                <div>
                  <h2 className="font-medium mb-3">
                    Background Gradient Angle
                  </h2>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    onMouseUp={() =>
                      saveThemeSettings({ gradientAngle: angle })
                    }
                    onTouchEnd={() =>
                      saveThemeSettings({ gradientAngle: angle })
                    }
                    className="w-full max-w-sm"
                  />
                  <p className="text-sm" style={{ color: "var(--muted-text)" }}>
                    {angle}°
                  </p>
                </div>

                {/* Icon pickers */}
                <div>
                  <h2 className="font-medium mb-3">Icons</h2>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    {Object.entries(iconSettings).map(([slot, currentIcon]) => {
                      const CurrentIconComponent = iconOptions[currentIcon];
                      return (
                        <div key={slot}>
                          <label
                            className="text-xs block mb-1 capitalize"
                            style={{ color: "var(--muted-text)" }}
                          >
                            {slot}
                          </label>
                          <div className="flex items-center gap-2">
                            {CurrentIconComponent && (
                              <CurrentIconComponent size={18} />
                            )}
                            <select
                              value={currentIcon}
                              onChange={(e) => {
                                const updated = {
                                  ...iconSettings,
                                  [slot]: e.target.value as IconName,
                                };
                                setIconSettings(updated);
                                saveThemeSettings({ icons: updated });
                              }}
                              className="rounded px-2 py-1 text-sm flex-1"
                              style={{
                                border: "1px solid var(--border-color)",
                              }}
                            >
                              {Object.keys(iconOptions).map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Respondent passphrase reset */}
                <div>
                  <h2 className="font-medium mb-3">Respondent Passphrase</h2>

                  {!showResetForm ? (
                    <button
                      onClick={() => {
                        setShowResetForm(true);
                        setResetSuccess(false);
                        setResetError("");
                      }}
                      className="text-sm underline"
                      style={{ color: "var(--text-color)" }}
                    >
                      Reset respondent passphrase
                    </button>
                  ) : (
                    <form
                      onSubmit={handleResetRespondentPassphrase}
                      className="space-y-3 max-w-sm rounded p-4"
                      style={{
                        background: "var(--card-gradient)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div>
                        <label
                          className="text-xs block mb-1"
                          style={{ color: "var(--muted-text)" }}
                        >
                          Your admin passphrase (to confirm it's you)
                        </label>
                        <input
                          type="password"
                          value={currentAdminPassphrase}
                          onChange={(e) =>
                            setCurrentAdminPassphrase(e.target.value)
                          }
                          className="w-full rounded px-3 py-2"
                          style={{ border: "1px solid var(--border-color)" }}
                          required
                        />
                      </div>
                      <div>
                        <label
                          className="text-xs block mb-1"
                          style={{ color: "var(--muted-text)" }}
                        >
                          New respondent passphrase
                        </label>
                        <input
                          type="password"
                          value={newRespondentPassphrase}
                          onChange={(e) =>
                            setNewRespondentPassphrase(e.target.value)
                          }
                          className="w-full rounded px-3 py-2"
                          style={{ border: "1px solid var(--border-color)" }}
                          minLength={8}
                          required
                        />
                      </div>

                      {resetError && (
                        <p className="text-red-600 text-sm">{resetError}</p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="rounded px-4 py-2 text-sm"
                          style={{
                            background: "var(--button-gradient)",
                            color: "#fff",
                          }}
                        >
                          Confirm Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetForm(false);
                            setResetError("");
                            setCurrentAdminPassphrase("");
                            setNewRespondentPassphrase("");
                          }}
                          className="text-sm"
                          style={{ color: "var(--muted-text)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {resetSuccess && (
                    <p className="text-green-700 text-sm mt-2">
                      Respondent passphrase updated. Share the new one with them
                      separately.
                    </p>
                  )}
                </div>

                {settingsSaved && (
                  <p className="text-green-700 text-sm">Saved!</p>
                )}
              </div>
            </div>
          )}
        </main>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <main className="max-w-md mx-auto mt-16 p-6">
        <h1 className="text-xl font-semibold mb-2">Admin Login</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted-text)" }}>
          Enter your admin password to access the dashboard.
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Your password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full rounded px-3 py-2 pr-10"
                style={{
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  color: "var(--text-color)",
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full rounded py-2"
            style={{ background: "var(--button-gradient)", color: "#fff" }}
          >
            Login
          </button>
        </form>
      </main>
    </ThemeProvider>
  );
}
