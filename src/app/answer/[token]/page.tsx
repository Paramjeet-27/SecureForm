"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ThemeProvider, { useThemeIcons } from "@/components/ThemeProvider";
import LoadingScreen from "@/components/LoadingScreen";
import InvalidTokenScreen from "@/components/InvalidTokenScreen";
import QuestionCard from "@/components/QuestionCard";
import { LogOut } from "lucide-react";
import { iconOptions, defaultIcons } from "@/iconOptions";
import Dropdown from "@/components/Dropdown";
import PasswordInput from "@/components/PasswordInput";

type Status = "loading" | "invalidToken" | "needsLogin" | "loggedIn";

export default function AnswerPage() {
  const params = useParams();
  const token = params.token as string;

  const { icons } = useThemeIcons();
  const LogoutIcon = iconOptions[icons.logout || defaultIcons.logout] || LogOut;

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [questions, setQuestions] = useState<Record<string, any> | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const [forms, setForms] = useState<
    { id: string; title: string; createdAt: string }[]
  >([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const saveTimers = useState<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  )[0];

  const loadForms = async () => {
    const res = await fetch("/api/forms");
    const data = await res.json();
    setForms(data.forms);
    if (data.forms.length > 0 && !selectedFormId) {
      setSelectedFormId(data.forms[0].id);
    }
  };

  useEffect(() => {
    const check = async () => {
      const verifyRes = await fetch("/api/respondent/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.valid) {
        setStatus("invalidToken");
        return;
      }

      const sessionRes = await fetch("/api/respondent/session-check");
      const sessionData = await sessionRes.json();

      if (sessionData.valid) {
        await loadForms();
        setStatus("loggedIn");
        return;
      }

      setStatus("needsLogin");
    };

    check().catch(() => setError("Could not reach server."));
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/respondent/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, passphrase }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed.");
      return;
    }

    setPassphrase("");

    await loadForms();
    setStatus("loggedIn");
  };

  useEffect(() => {
    if (status !== "loggedIn" || !selectedFormId) return;

    const loadQuestions = async () => {
      try {
        const res = await fetch(
          `/api/respondent/data?formId=${selectedFormId}`,
        );
        const dataJson = await res.json();
        if (res.ok) {
          setQuestions(dataJson.questions);
        } else {
          setQuestions(null);
        }
      } catch (err) {
        console.error("Failed to load questions", err);
      }
    };

    loadQuestions();
  }, [status, selectedFormId]);

  const saveAnswer = async (questionId: string, value: string | string[]) => {
    setSavingIds((prev) => new Set(prev).add(questionId));

    const res = await fetch(`/api/respondent/answer?formId=${selectedFormId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, value }),
    });

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });

    if (res.status === 401) {
      alert(
        "Your session expired. Please log in again to keep saving answers.",
      );
      setStatus("needsLogin");
      setQuestions(null);
      return;
    }
  };

  const handleChange = (questionId: string, value: string | string[]) => {
    // Optimistically update local state immediately
    setQuestions((prev) =>
      prev
        ? {
            ...prev,
            [questionId]: {
              ...prev[questionId],
              answer: { value, updatedAt: new Date().toISOString() },
            },
          }
        : prev,
    );

    // Debounce the actual save by 600ms so we don't hammer the API on every keystroke
    clearTimeout(saveTimers[questionId]);
    saveTimers[questionId] = setTimeout(
      () => saveAnswer(questionId, value),
      600,
    );
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
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

  if (status === "loggedIn") {
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
            // maxWidth: "600px",
            // margin: "0 auto",
          }}
        >
          {/* Header section — flexShrink:0 keeps it pinned */}
          <div style={{ flexShrink: 0, marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "var(--text-color)",
                }}
              >
                Questions
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
                <LogoutIcon size={26} />
                Logout
              </button>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--muted-text)",
                marginBottom: "0.75rem",
              }}
            >
              {Object.keys(questions || {}).length} question(s) available.
            </p>

              <Dropdown
                value={selectedFormId || ""}
                onChange={(val) => setSelectedFormId(val || null)}
                options={
                  forms.length === 0
                    ? [{ value: "", label: "No Forms Available" }]
                    : forms.map((f) => ({ value: f.id, label: f.title }))
                }
                disabled={forms.length === 0}
                iconSize={16}
                wrapperStyle={{ width: "100%", marginBottom: "0.5rem" }}
                className="md:max-w-xs"
              />
          </div>

          {/* Scrollable list of Question Cards */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              paddingBottom: "2rem",
            }}
          >
            <div className="space-y-4">
              {questions &&
                Object.entries(questions)
                  .sort((a: any, b: any) => a[1].order - b[1].order)
                  .map(([id, q]: [string, any]) => {
                    let saveStatus: "saving" | "saved" | null = null;
                    if (savingIds.has(id)) {
                      saveStatus = "saving";
                    } else if (q.answer) {
                      saveStatus = "saved";
                    }

                    return (
                      <QuestionCard
                        key={id}
                        question={{ id, ...q }}
                        mode="respondent"
                        value={q.answer?.value ?? ""}
                        onChange={(val) => handleChange(id, val)}
                        status={saveStatus}
                      />
                    );
                  })}
            </div>
          </div>
        </main>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <main className="max-w-md mx-auto mt-16 p-6">
        <h1 className="text-xl font-semibold mb-2">Respondent Login</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted-text)" }}>
          Enter your password to access the questionnaire.
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Your password</label>
            <PasswordInput
              value={passphrase}
              onChange={setPassphrase}
              required
            />
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
