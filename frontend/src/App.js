import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, basicToken } from "@/lib/api";
const NEW_QUESTIONNAIRE_OPTION = "__new__";
const DEFAULT_DRAFT_QUESTIONS = [
    {
        prompt: "How long are user passwords in your applications?",
        answerType: "number",
        regex: ""
    }
];
function AuthRequiredOverlay({ show, children }) {
    return (_jsxs("div", { className: "auth-lock-container", children: [children, show && (_jsx("div", { className: "auth-lock-overlay", "aria-hidden": "true", children: _jsx("div", { className: "auth-lock-overlay__label", children: "Sign in required to use this section" }) }))] }));
}
export default function App() {
    const [username, setUsername] = useState("qa_user");
    const [password, setPassword] = useState("qa_password");
    const [token, setToken] = useState(null);
    const [message, setMessage] = useState("");
    const [questionnaires, setQuestionnaires] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [details, setDetails] = useState(null);
    const [answers, setAnswers] = useState({});
    const [title, setTitle] = useState("Security Questionnaire");
    const [editorSelectionId, setEditorSelectionId] = useState(NEW_QUESTIONNAIRE_OPTION);
    const [draftQuestions, setDraftQuestions] = useState(DEFAULT_DRAFT_QUESTIONS);
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
                }
                catch {
                    return "Questionnaire contains an invalid regex pattern";
                }
            }
        }
        return null;
    }, [answers, details]);
    async function refreshQuestionnaires(authToken) {
        const list = (await api.listQuestionnaires(authToken));
        setQuestionnaires(list);
    }
    async function handleRegister() {
        try {
            await api.register(username, password);
            setMessage("Registered successfully. Check backend logs and click the verification link.");
        }
        catch (error) {
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
        }
        catch (error) {
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
            }
            else {
                await api.createQuestionnaire(token, payload);
            }
            setMessage(editorSelectionId !== NEW_QUESTIONNAIRE_OPTION
                ? "Questionnaire updated."
                : "Questionnaire created.");
            setEditorSelectionId(NEW_QUESTIONNAIRE_OPTION);
            setTitle("Security Questionnaire");
            setDraftQuestions(DEFAULT_DRAFT_QUESTIONS);
            await refreshQuestionnaires(token);
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function handleEditorSelectionChange(id) {
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
            const loaded = (await api.getQuestionnaire(token, id));
            setTitle(loaded.title);
            setDraftQuestions(loaded.questions.map((q) => ({
                prompt: q.prompt,
                answerType: q.answerType,
                regex: q.regex || ""
            })));
            setMessage(`Editing questionnaire: ${loaded.title}`);
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function loadQuestionnaire(id) {
        if (!token) {
            return;
        }
        try {
            setSelectedId(id);
            const loaded = (await api.getQuestionnaire(token, id));
            setDetails(loaded);
            setAnswers({});
        }
        catch (error) {
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
            await api.submitResponses(token, details.id, details.questions.map((q) => ({
                questionId: q.id,
                value: answers[q.id] || ""
            })));
            setMessage("Responses submitted.");
        }
        catch (error) {
            setMessage(error.message);
        }
    }
    async function handleUpload(file) {
        if (!token || !file) {
            return;
        }
        try {
            setUploading(true);
            const result = await api.uploadEvidence(token, file);
            setMessage(`Evidence uploaded: ${result.chunks} chunks indexed for retrieval.`);
            if (selectedId) {
                await loadQuestionnaire(selectedId);
            }
        }
        catch (error) {
            setMessage(error.message);
        }
        finally {
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
        const initial = {};
        details.questions.forEach((q) => {
            initial[q.id] = "";
        });
        setAnswers(initial);
    }, [details]);
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { className: "appear", children: "QA Interview Task: Questionnaire + Evidence RAG" }), _jsx("p", { children: "Build and test validation, evidence retrieval, and secure API behavior." }), _jsxs("div", { className: "grid grid-2", children: [_jsxs("section", { className: "card appear", children: [_jsx("h2", { children: "1. Auth" }), _jsxs("div", { className: "grid", children: [_jsx(Input, { value: username, onChange: (e) => setUsername(e.target.value), placeholder: "Username" }), _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Password" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx(Button, { onClick: handleRegister, children: "Register" }), _jsx(Button, { variant: "ghost", onClick: handleLogin, children: "Login" })] }), _jsx("small", { children: message })] })] }), _jsxs("section", { className: "card appear", children: [_jsx("h2", { children: "2. Upload Evidence" }), _jsxs(AuthRequiredOverlay, { show: !canUseApp, children: [_jsx("p", { style: { color: "var(--muted)" }, children: "Upload PDF, DOCX, or TXT before answering questionnaires." }), _jsx(Input, { type: "file", accept: ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain", onChange: (e) => handleUpload(e.target.files?.[0] || null), disabled: uploading }), uploading && _jsx("p", { children: "Uploading and indexing..." })] })] })] }), _jsxs("div", { className: "grid grid-2", style: { marginTop: 16 }, children: [_jsxs("section", { className: "card appear", children: [_jsx("h2", { children: "3. Create Or Edit Questionnaire" }), _jsx(AuthRequiredOverlay, { show: !canUseApp, children: _jsxs("div", { className: "grid", children: [_jsxs("select", { value: editorSelectionId, onChange: (e) => handleEditorSelectionChange(e.target.value), style: {
                                                borderRadius: 10,
                                                border: "1px solid var(--line)",
                                                padding: "0.55rem"
                                            }, children: [_jsx("option", { value: NEW_QUESTIONNAIRE_OPTION, children: "Create new questionnaire" }), questionnaires.map((q) => (_jsxs("option", { value: q.id, children: ["Edit: ", q.title] }, q.id)))] }), _jsx(Input, { value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Questionnaire title" }), editorSelectionId !== NEW_QUESTIONNAIRE_OPTION && (_jsx("small", { children: "Editing existing questionnaire. Saving will update it." })), draftQuestions.map((q, idx) => (_jsx("div", { className: "card", style: { padding: 12 }, children: _jsxs("div", { className: "grid", children: [_jsx(Textarea, { rows: 2, value: q.prompt, onChange: (e) => {
                                                            const copy = [...draftQuestions];
                                                            copy[idx].prompt = e.target.value;
                                                            setDraftQuestions(copy);
                                                        }, placeholder: "Question prompt" }), _jsxs("select", { value: q.answerType, onChange: (e) => {
                                                            const copy = [...draftQuestions];
                                                            copy[idx].answerType = e.target.value;
                                                            setDraftQuestions(copy);
                                                        }, style: {
                                                            borderRadius: 10,
                                                            border: "1px solid var(--line)",
                                                            padding: "0.55rem"
                                                        }, children: [_jsx("option", { value: "text", children: "Text" }), _jsx("option", { value: "number", children: "Number" })] }), _jsx(Input, { value: q.regex, onChange: (e) => {
                                                            const copy = [...draftQuestions];
                                                            copy[idx].regex = e.target.value;
                                                            setDraftQuestions(copy);
                                                        }, placeholder: "Regex (optional)" })] }) }, idx))), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx(Button, { variant: "ghost", onClick: () => setDraftQuestions([
                                                        ...draftQuestions,
                                                        { prompt: "", answerType: "text", regex: "" }
                                                    ]), children: "Add Question" }), _jsx(Button, { onClick: handleCreateQuestionnaire, children: editorSelectionId !== NEW_QUESTIONNAIRE_OPTION
                                                        ? "Update Questionnaire"
                                                        : "Save Questionnaire" })] })] }) })] }), _jsxs("section", { className: "card appear", children: [_jsx("h2", { children: "4. Fill Questionnaire" }), _jsx(AuthRequiredOverlay, { show: !canUseApp, children: _jsxs("div", { className: "grid", children: [_jsxs("select", { value: selectedId, onChange: (e) => loadQuestionnaire(e.target.value), style: {
                                                borderRadius: 10,
                                                border: "1px solid var(--line)",
                                                padding: "0.55rem"
                                            }, children: [_jsx("option", { value: "", children: "Select questionnaire" }), questionnaires.map((q) => (_jsx("option", { value: q.id, children: q.title }, q.id)))] }), details && (_jsxs("div", { className: "grid", children: [details.questions.map((q) => (_jsxs("div", { className: "card", style: { padding: 12 }, children: [_jsx("strong", { children: q.prompt }), _jsx("div", { style: { marginTop: 8 }, children: _jsx(Input, { type: q.answerType === "number" ? "number" : "text", value: answers[q.id] || "", onChange: (e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value })), placeholder: "Your answer" }) }), _jsxs("div", { style: { marginTop: 10 }, children: [_jsx("small", { style: { color: "var(--muted)" }, children: "Relevant evidence:" }), q.evidence.length === 0 && _jsx("p", { children: "No relevant files found yet." }), q.evidence.map((ev) => (_jsxs("div", { style: {
                                                                        border: "1px solid var(--line)",
                                                                        borderRadius: 10,
                                                                        padding: 8,
                                                                        marginTop: 8,
                                                                        background: "#fff"
                                                                    }, children: [_jsxs("div", { children: [_jsx("strong", { children: ev.fileName }), " (score: ", ev.score.toFixed(2), ")"] }), _jsx("small", { children: ev.snippet })] }, ev.id)))] })] }, q.id))), _jsx(Button, { onClick: handleSubmitAnswers, disabled: Boolean(submissionValidationError), children: "Submit Responses" }), submissionValidationError && (_jsx("small", { style: { color: "var(--danger)" }, children: submissionValidationError }))] }))] }) })] })] })] }));
}
