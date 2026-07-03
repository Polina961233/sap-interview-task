const API_BASE = "http://localhost:4000";
export function basicToken(username, password) {
    return btoa(`${username}:${password}`);
}
async function request(path, options = {}, basicAuthToken) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    if (basicAuthToken) {
        headers.Authorization = `Basic ${basicAuthToken}`;
    }
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });
    if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(payload.message || "Request failed");
    }
    return res.json();
}
export const api = {
    register: (username, password) => request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password })
    }),
    me: (token) => request("/auth/me", {}, token),
    listQuestionnaires: (token) => request("/questionnaires", {}, token),
    createQuestionnaire: (token, payload) => request("/questionnaires", {
        method: "POST",
        body: JSON.stringify(payload)
    }, token),
    updateQuestionnaire: (token, id, payload) => request(`/questionnaires/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
    }, token),
    getQuestionnaire: (token, id) => request(`/questionnaires/${id}`, {}, token),
    submitResponses: (token, id, answers) => request(`/questionnaires/${id}/responses`, {
        method: "POST",
        body: JSON.stringify({ answers })
    }, token),
    uploadEvidence: async (token, file) => {
        const data = new FormData();
        data.append("file", file);
        const res = await fetch(`${API_BASE}/evidence/upload`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${token}`
            },
            body: data
        });
        if (!res.ok) {
            const payload = await res.json().catch(() => ({ message: "Upload failed" }));
            throw new Error(payload.message || "Upload failed");
        }
        return res.json();
    }
};
