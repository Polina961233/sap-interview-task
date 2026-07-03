import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, basicToken } from "@/lib/api";
import type { QuestionnaireDetails, QuestionnaireSummary } from "@/lib/types";

type DraftQuestion = {
  prompt: string;
  answerType: "text" | "number";
  regex: string;
};

const NEW_QUESTIONNAIRE_OPTION = "__new__";

const DEFAULT_DRAFT_QUESTIONS: DraftQuestion[] = [
  {
    prompt: "How long are user passwords in your applications?",
    answerType: "number",
    regex: ""
  }
];

function AuthRequiredOverlay({
  show,
  children
}: {
  show: boolean;
  children: ReactNode;
}) {
  return (
    <div className="auth-lock-container">
      {children}
      {show && (
        <div className="auth-lock-overlay" aria-hidden="true">
          <div className="auth-lock-overlay__label">Sign in required to use this section</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState("qa_user");
  const [password, setPassword] = useState("qa_password");
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  const [questionnaires, setQuestionnaires] = useState<QuestionnaireSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [details, setDetails] = useState<QuestionnaireDetails | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("Security Questionnaire");
  const [editorSelectionId, setEditorSelectionId] = useState<string>(NEW_QUESTIONNAIRE_OPTION);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>(DEFAULT_DRAFT_QUESTIONS);

  const [uploading, setUploading] = useState(false);

  const canUseApp = useMemo(() => Boolean(token), [token]);

  const submissionValidationError = useMemo(() => {
    if (!details) {
      return "No questionnaire selected";
    }

    if (details.questions.length === 0) {
      return "Questionnaire has no questions";
    }

    for (const q of details.questions) {
      const value = (answers[q.id] || "").trim();
      if (!value) {
        return "All questions must be answered before submission";
      }

      if (q.answerType === "number" && Number.isNaN(Number(value))) {
        return "All number questions must contain valid numeric values";
      }

      if (q.regex) {
        try {
          const re = new RegExp(q.regex);
          if (!re.test(value)) {
            return "One or more answers do not match validation regex";
          }
        } catch {
          return "Questionnaire contains an invalid regex pattern";
        }
      }
    }

    return null;
  }, [answers, details]);

  async function refreshQuestionnaires(authToken: string) {
    const list = (await api.listQuestionnaires(authToken)) as QuestionnaireSummary[];
    setQuestionnaires(list);
  }

  async function handleRegister() {
    try {
      await api.register(username, password);
      setMessage("Registered successfully. Check backend logs and click the verification link.");
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  async function handleLogin() {
    try {
      const t = basicToken(username, password);
      await api.me(t);
      setToken(t);
      setMessage("Login successful.");
      await refreshQuestionnaires(t);
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  async function handleCreateQuestionnaire() {
    if (!token) {
      return;
    }

    try {
      const payload = {
        title,
        questions: draftQuestions.map((q) => ({
          prompt: q.prompt,
          answerType: q.answerType,
          regex: q.regex || undefined
        }))
      };

      if (editorSelectionId !== NEW_QUESTIONNAIRE_OPTION) {
        await api.updateQuestionnaire(token, editorSelectionId, payload);
      } else {
        await api.createQuestionnaire(token, payload);
      }

      setMessage(
        editorSelectionId !== NEW_QUESTIONNAIRE_OPTION
          ? "Questionnaire updated."
          : "Questionnaire created."
      );
      setEditorSelectionId(NEW_QUESTIONNAIRE_OPTION);
      setTitle("Security Questionnaire");
      setDraftQuestions(DEFAULT_DRAFT_QUESTIONS);
      await refreshQuestionnaires(token);
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  async function handleEditorSelectionChange(id: string) {
    setEditorSelectionId(id);

    if (!token) {
      return;
    }

    if (id === NEW_QUESTIONNAIRE_OPTION) {
      setTitle("Security Questionnaire");
      setDraftQuestions(DEFAULT_DRAFT_QUESTIONS);
      return;
    }

    try {
      const loaded = (await api.getQuestionnaire(token, id)) as QuestionnaireDetails;
      setTitle(loaded.title);
      setDraftQuestions(
        loaded.questions.map((q) => ({
          prompt: q.prompt,
          answerType: q.answerType,
          regex: q.regex || ""
        }))
      );
      setMessage(`Editing questionnaire: ${loaded.title}`);
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  async function loadQuestionnaire(id: string) {
    if (!token) {
      return;
    }

    try {
      setSelectedId(id);
      const loaded = (await api.getQuestionnaire(token, id)) as QuestionnaireDetails;
      setDetails(loaded);
      setAnswers({});
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  async function handleSubmitAnswers() {
    if (!token || !details) {
      return;
    }

    if (submissionValidationError) {
      setMessage(submissionValidationError);
      return;
    }

    try {
      await api.submitResponses(
        token,
        details.id,
        details.questions.map((q) => ({
          questionId: q.id,
          value: answers[q.id] || ""
        }))
      );
      setMessage("Responses submitted.");
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  async function handleUpload(file: File | null) {
    if (!token || !file) {
      return;
    }

    try {
      setUploading(true);
      const result = await api.uploadEvidence(token, file);
      setMessage(
        `Evidence uploaded: ${result.chunks} chunks indexed for retrieval.`
      );

      if (selectedId) {
        await loadQuestionnaire(selectedId);
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    if (verified === "success") {
      setMessage("Account verified. You can log in now.");
      window.history.replaceState({}, "", "/");
    }

    if (verified === "error") {
      setMessage("Verification failed. Please use a valid verification link.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    if (!details) {
      return;
    }

    const initial: Record<string, string> = {};
    details.questions.forEach((q) => {
      initial[q.id] = "";
    });
    setAnswers(initial);
  }, [details]);

  return (
    <div className="container">
      <h1 className="appear">QA Interview Task: Questionnaire + Evidence RAG</h1>
      <p>
        Build and test validation, evidence retrieval, and secure API behavior.
      </p>

      <div className="grid grid-2">
        <section className="card appear">
          <h2>1. Auth</h2>
          <div className="grid">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={handleRegister}>Register</Button>
              <Button variant="ghost" onClick={handleLogin}>
                Login
              </Button>
            </div>
            <small>{message}</small>
          </div>
        </section>

        <section className="card appear">
          <h2>2. Upload Evidence</h2>
          <AuthRequiredOverlay show={!canUseApp}>
            <p style={{ color: "var(--muted)" }}>
              Upload PDF, DOCX, or TXT before answering questionnaires.
            </p>
            <Input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => handleUpload(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {uploading && <p>Uploading and indexing...</p>}
          </AuthRequiredOverlay>
        </section>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <section className="card appear">
          <h2>3. Create Or Edit Questionnaire</h2>
          <AuthRequiredOverlay show={!canUseApp}>
            <div className="grid">
              <select
                value={editorSelectionId}
                onChange={(e) => handleEditorSelectionChange(e.target.value)}
                style={{
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  padding: "0.55rem"
                }}
              >
                <option value={NEW_QUESTIONNAIRE_OPTION}>Create new questionnaire</option>
                {questionnaires.map((q) => (
                  <option key={q.id} value={q.id}>
                    Edit: {q.title}
                  </option>
                ))}
              </select>

              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Questionnaire title"
              />

              {editorSelectionId !== NEW_QUESTIONNAIRE_OPTION && (
                <small>
                  Editing existing questionnaire. Saving will update it.
                </small>
              )}

              {draftQuestions.map((q, idx) => (
                <div key={idx} className="card" style={{ padding: 12 }}>
                  <div className="grid">
                    <Textarea
                      rows={2}
                      value={q.prompt}
                      onChange={(e) => {
                        const copy = [...draftQuestions];
                        copy[idx].prompt = e.target.value;
                        setDraftQuestions(copy);
                      }}
                      placeholder="Question prompt"
                    />
                    <select
                      value={q.answerType}
                      onChange={(e) => {
                        const copy = [...draftQuestions];
                        copy[idx].answerType = e.target.value as "text" | "number";
                        setDraftQuestions(copy);
                      }}
                      style={{
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        padding: "0.55rem"
                      }}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                    </select>
                    <Input
                      value={q.regex}
                      onChange={(e) => {
                        const copy = [...draftQuestions];
                        copy[idx].regex = e.target.value;
                        setDraftQuestions(copy);
                      }}
                      placeholder="Regex (optional)"
                    />
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setDraftQuestions([
                      ...draftQuestions,
                      { prompt: "", answerType: "text", regex: "" }
                    ])
                  }
                >
                  Add Question
                </Button>
                <Button onClick={handleCreateQuestionnaire}>
                  {editorSelectionId !== NEW_QUESTIONNAIRE_OPTION
                    ? "Update Questionnaire"
                    : "Save Questionnaire"}
                </Button>
              </div>
            </div>
          </AuthRequiredOverlay>
        </section>

        <section className="card appear">
          <h2>4. Fill Questionnaire</h2>
          <AuthRequiredOverlay show={!canUseApp}>
            <div className="grid">
              <select
                value={selectedId}
                onChange={(e) => loadQuestionnaire(e.target.value)}
                style={{
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  padding: "0.55rem"
                }}
              >
                <option value="">Select questionnaire</option>
                {questionnaires.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>

              {details && (
                <div className="grid">
                  {details.questions.map((q) => (
                    <div key={q.id} className="card" style={{ padding: 12 }}>
                      <strong>{q.prompt}</strong>
                      <div style={{ marginTop: 8 }}>
                        <Input
                          type={q.answerType === "number" ? "number" : "text"}
                          value={answers[q.id] || ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Your answer"
                        />
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <small style={{ color: "var(--muted)" }}>
                          Relevant evidence:
                        </small>
                        {q.evidence.length === 0 && <p>No relevant files found yet.</p>}
                        {q.evidence.map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              border: "1px solid var(--line)",
                              borderRadius: 10,
                              padding: 8,
                              marginTop: 8,
                              background: "#fff"
                            }}
                          >
                            <div>
                              <strong>{ev.fileName}</strong> (score: {ev.score.toFixed(2)})
                            </div>
                            <small>{ev.snippet}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <Button onClick={handleSubmitAnswers} disabled={Boolean(submissionValidationError)}>
                    Submit Responses
                  </Button>
                  {submissionValidationError && (
                    <small style={{ color: "var(--danger)" }}>{submissionValidationError}</small>
                  )}
                </div>
              )}
            </div>
          </AuthRequiredOverlay>
        </section>
      </div>
    </div>
  );
}
