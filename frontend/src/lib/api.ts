const BASE = (import.meta.env.VITE_API_BASE as string | undefined) || "/api";

export class ApiError extends Error {}

// Browser session ke liye Unique Session ID generate/read karne ka helper
function getSessionId(): string {
  let sessionId = localStorage.getItem("careerpilot_session_id");
  if (!sessionId) {
    sessionId = "user_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
    localStorage.setItem("careerpilot_session_id", sessionId);
  }
  return sessionId;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;

  // Existing headers ke sath X-Session-ID merge kar rahe hain
  const headers = new Headers(init?.headers || {});
  headers.set("X-Session-ID", getSessionId());

  const updatedInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    res = await fetch(BASE + path, updatedInit);
  } catch {
    throw new ApiError("Can't reach the API. Is the backend running on port 8000?");
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(msg);
  }
  return (await res.json()) as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  get: <T,>(p: string) => req<T>(p),
  post: <T,>(p: string, body?: unknown) => req<T>(p, json("POST", body ?? {})),
  patch: <T,>(p: string, body: unknown) => req<T>(p, json("PATCH", body)),
  del: <T,>(p: string) => req<T>(p, { method: "DELETE" }),
  upload: <T,>(p: string, file: File) => {
    const f = new FormData();
    f.append("file", file);
    return req<T>(p, { method: "POST", body: f });
  },
};