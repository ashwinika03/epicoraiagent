import axios from "axios";
import { DEMO_MODE, mockAdapter, mockStreamChat } from "./mockApi";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
  // TEMP (frontend-only testing): answer every request locally, no backend.
  ...(DEMO_MODE ? { adapter: mockAdapter } : {}),
});

// Attach JWT access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// >>> ADDED: silent refresh-on-401. The access token is now short-lived
// by design (see backend/app/config.py), so it expiring mid-session is
// expected/frequent. Instead of immediately logging the user out on the
// first 401, we exchange the stored refresh token for a new access token
// once and retry the original request. Only if that also fails (no
// refresh token stored, or it's itself expired/invalid) do we fall back
// to the old behavior: clear storage and reload to the login screen.
//
// Uses a bare `axios` call (not the `api` instance) for the refresh
// request itself, so it never carries a stale Authorization header and
// never re-enters this same interceptor.
let refreshInFlight = null;

function refreshAccessTokenSilently() {
  if (!refreshInFlight) {
    const storedRefreshToken = localStorage.getItem("refresh_token");

    if (!storedRefreshToken) {
      refreshInFlight = Promise.reject(
        new Error("No refresh token available")
      );
    } else {
      refreshInFlight = axios
        .post("/api/auth/refresh", { refresh_token: storedRefreshToken })
        .then((res) => {
          localStorage.setItem("token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          return res.data.access_token;
        })
        .finally(() => {
          refreshInFlight = null;
        });
    }
  }

  return refreshInFlight;
}

// Handle authentication errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retried) {
      originalRequest._retried = true;

      try {
        const newAccessToken = await refreshAccessTokenSilently();

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        window.location.reload();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/* =========================================================
   AUTH
   ========================================================= */

export const login = (username, password) =>
  api.post("/auth/login", {
    username,
    password,
  });

// >>> ADDED: exposed directly in case a caller wants to trigger a refresh
// manually — normal 401 handling above already does this automatically.
export const refreshAccessToken = (refreshToken) =>
  api.post("/auth/refresh", { refresh_token: refreshToken });

// >>> ADDED: revokes the refresh token server-side. Callers should still
// clear "token"/"refresh_token" from localStorage themselves afterward
// (AuthContext's logout function is the right place for that).
export const logout = () => api.post("/auth/logout");

export const getMe = () =>
  api.get("/auth/me");

export const updateProfile = (displayName, email, phone) =>
  api.patch("/auth/me", {
    display_name: displayName,
    email,
    phone,
  });

export const changePassword = (
  currentPassword,
  newPassword
) =>
  api.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });

// Forgot-password flow
export const requestPasswordReset = (email) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (email, code, newPassword) =>
  api.post("/auth/reset-password", {
    email,
    code,
    new_password: newPassword,
  });
  
export const setupTwoFactor = () =>
  api.post("/auth/2fa/setup");

export const verifyTwoFactorSetup = (otp) =>
  api.post("/auth/2fa/setup/verify", {
    otp,
  });

export const verifyTwoFactorLogin = (
  challenge,
  otp
) =>
  api.post("/auth/2fa/verify-login", {
    challenge,
    otp,
  });
  
export const updateTwoFactor = (enabled) =>
  api.patch("/auth/2fa", {
    enabled,
  });
  
/* =========================================================
   HEALTH
   ========================================================= */

export const getHealth = () =>
  api.get("/health");

/* =========================================================
   SCHEMA
   ========================================================= */

export const getSchemaProgress = () =>
  api.get("/schema/progress");

/* =========================================================
   CHAT
   ========================================================= */

export const sendChatQuery = (message, sessionId = null) =>
  api.post("/chat/query", {
    message,
    session_id: sessionId,
  });

/*
 * Stream a chat response from the backend.
 *
 * The existing sendChatQuery() remains unchanged for backward
 * compatibility. This function is used only by the new streaming flow.
 *
 * Events received from the backend:
 * - status
 * - chunk
 * - done
 * - error
 */
export const streamChatQuery = async (
  message,
  sessionId = null,
  {
    onStatus,
    onChunk,
    onDone,
    onError,
  } = {},
  signal = null
) => {
  // TEMP (frontend-only testing): simulated streaming reply, no backend.
  if (DEMO_MODE) {
    return mockStreamChat(
      message,
      sessionId,
      { onStatus, onChunk, onDone, onError },
      signal
    );
  }

  const token = localStorage.getItem("token");

  const response = await fetch("/api/chat/query/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
    signal,
  });

  // Compatibility fallback for an older backend that has not yet received
  // the streaming route. The stable /chat/query endpoint remains usable.
  if (response.status === 404) {
    onStatus?.("Thinking…");
    const result = await sendChatQuery(message, sessionId);
    if (signal?.aborted) return;

    const data = result.data || {};
    onStatus?.("Finalizing response…");

    const answer = String(data.answer || "");
    const chunks = answer.match(/\S+\s*/g) || (answer ? [answer] : []);

    for (const chunk of chunks) {
      if (signal?.aborted) return;
      onChunk?.(chunk);
      await new Promise((resolve) => setTimeout(resolve, 18));
    }

    onDone?.(data);
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      window.location.reload();
      return;
    }

    let errorMessage = "Unable to process your request.";

    try {
      const errorData = await response.json();
      errorMessage =
        errorData.detail ||
        errorData.message ||
        errorMessage;
    } catch {
      // Keep safe default.
    }

    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by the response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processEvent = (rawEvent) => {
    if (!rawEvent.trim()) return;

    let eventType = "message";
    let eventData = "";

    for (const line of rawEvent.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith("data:")) {
        eventData += line.substring(5).trim();
      }
    }

    if (!eventData) return;

    let data;
    try {
      data = JSON.parse(eventData);
    } catch {
      return;
    }

    switch (eventType) {
      case "status":
        onStatus?.(data.message);
        break;
      case "chunk":
        onChunk?.(data.text || "");
        break;
      case "done":
        onDone?.(data);
        break;
      case "error":
        onError?.(
          data.message || "Unable to complete your request."
        );
        break;
      default:
        break;
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";

      for (const rawEvent of events) {
        processEvent(rawEvent);
      }
    }

    if (buffer.trim()) {
      processEvent(buffer);
    }
  } finally {
    reader.releaseLock();
  }
};

/*
 * Execute SQL from a historical chat message.
 *
 * This does NOT create a new chat message/session.
 */
export const executeHistoricalQuery = (sessionId, sql) =>
  api.post("/chat/execute-history-query", {
    session_id: sessionId,
    sql,
  });

/* =========================================================
   CHAT FEEDBACK
   ========================================================= */

/*
 * Submit feedback for an assistant chat message.
 *
 * feedbackType:
 *   "positive" -> thumbs up
 *   "negative" -> thumbs down / improvement feedback
 *
 * improvementText:
 *   Optional text describing what could be improved.
 */
export const submitChatFeedback = (
  messageId,
  feedbackType,
  improvementText = null
) =>
  api.post("/chat/feedback", {
    message_id: messageId,
    feedback_type: feedbackType,
    improvement_text: improvementText,
  });

/* =========================================================
   HISTORY
   ========================================================= */

export const getHistorySessions = (limit = 50, offset = 0) =>
  api.get("/history/sessions", {
    params: {
      limit,
      offset,
    },
  });

export const getSessionMessages = (sessionId) =>
  api.get(`/history/sessions/${sessionId}/messages`);

export const searchHistory = (query, limit = 20) =>
  api.get("/history/search", {
    params: {
      q: query,
      limit,
    },
  });

export const deleteSession = (sessionId) =>
  api.delete(`/history/sessions/${sessionId}`);

/*
 * Export complete chat session as PDF.
 *
 * include_table:
 *   true  -> PDF includes query result tables
 *   false -> PDF contains conversation only
 */
export const exportSessionPdf = (
  sessionId,
  includeTable = true
) =>
  api.get(`/history/sessions/${sessionId}/export/pdf`, {
    params: {
      include_table: includeTable,
    },
    responseType: "blob",
  });

/* =========================================================
   DASHBOARD
   ========================================================= */

export const getDashboardMetrics = () =>
  api.get("/dashboard/metrics");

export const getDashboardSummary = () =>
  api.get("/dashboard/summary");

/*
 * One request for all dashboard cards/charts.
 */
export const getDashboardData = () =>
  api.get("/dashboard/data");

/*
 * Individual dashboard chart.
 */
export const getDashboardChartData = (queryKey) =>
  api.get(
    `/dashboard/chart-data/${encodeURIComponent(queryKey)}`
  );

/* =========================================================
   INSIGHTS
   ========================================================= */

export const getDashboardInsights = () =>
  api.get("/dashboard/insights");

/* =========================================================
   EXPORT QUERY RESULT
   ========================================================= */

/*
 * Export a query result to Excel.
 *
 * messageId is actually the result_id returned by the backend.
 */
export const exportQueryResult = (resultId) =>
  api.get(`/chat/export/${resultId}`, {
    responseType: "blob",
  });

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default api;