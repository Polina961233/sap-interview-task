const API_BASE = "http://localhost:4000";

export function basicToken(username: string, password: string) {
  return btoa(`${username}:${password}`);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  basicAuthToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string> | undefined) || {})
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
  register: (username: string, password: string) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),

  me: (token: string) => request("/auth/me", {}, token),

  listQuestionnaires: (token: string) => request("/questionnaires", {}, token),

  createQuestionnaire: (
    token: string,
    payload: {
      title: string;
      questions: Array<{ prompt: string; answerType: "text" | "number"; regex?: string }>;
    }
  ) =>
    request("/questionnaires", {
      method: "POST",
      body: JSON.stringify(payload)
    }, token),

  updateQuestionnaire: (
    token: string,
    id: string,
    payload: {
      title: string;
      questions: Array<{ prompt: string; answerType: "text" | "number"; regex?: string }>;
    }
  ) =>
    request(`/questionnaires/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }, token),

  getQuestionnaire: (token: string, id: string) =>
    request(`/questionnaires/${id}`, {}, token),

  submitResponses: (
    token: string,
    id: string,
    answers: Array<{ questionId: string; value: string }>
  ) =>
    request(`/questionnaires/${id}/responses`, {
      method: "POST",
      body: JSON.stringify({ answers })
    }, token),

  uploadEvidence: async (token: string, file: File) => {
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
