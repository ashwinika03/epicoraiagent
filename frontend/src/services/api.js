
import axios from "axios";

// --------------------------------------------------
// AUTH TOKEN — MEMORY ONLY
// --------------------------------------------------

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token || null;
};

export const clearAuthToken = () => {
  authToken = null;
};

// --------------------------------------------------
// BACKEND CONFIGURATION
// --------------------------------------------------

const backendOrigin = (
  import.meta.env.VITE_QUENZA_API_BASE_URL || "https://quenzaai.com"
).replace(/\/+$/, "");

const quenzaApi = axios.create({
  baseURL: `${backendOrigin}/v1`,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// --------------------------------------------------
// AUTHORIZATION HEADER
// --------------------------------------------------

quenzaApi.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

// --------------------------------------------------
// AUTHENTICATION — CONFIRMED ENDPOINTS
// --------------------------------------------------

export const login = (username, password) =>
  quenzaApi.post("/login", { username, password });

export const logout = () =>
  quenzaApi.post("/logout");

export const getMe = () =>
  quenzaApi.get("/me");

// --------------------------------------------------
// AVAILABLE QUERIES — CONFIRMED ENDPOINT
// --------------------------------------------------

export const getAvailableQueries = () =>
  quenzaApi.get("/queries");

// --------------------------------------------------
// HEALTH CHECK — CONFIRMED ENDPOINT
// --------------------------------------------------

export const getHealth = () =>
  axios.get(`${backendOrigin}/healthz`, {
    timeout: 15000,
  });

// --------------------------------------------------
// CHAT — CONFIRMED ENDPOINT
// --------------------------------------------------

export const sendChatQuery = (
  message,
  sessionId = null,
  signal = null
) =>
  quenzaApi.post(
    "/ask",
    {
      question: message,
      ...(sessionId
        ? { conversation_id: sessionId }
        : {}),
    },
    { signal }
  );

// --------------------------------------------------
// CHAT COMPATIBILITY WRAPPER
// Backend currently supports non-streaming responses.
// --------------------------------------------------

export const streamChatQuery = async (
  message,
  sessionId = null,
  { onStatus, onChunk, onDone, onError } = {},
  signal = null
) => {
  if (signal?.aborted) return;

  try {
    onStatus?.("Thinking...");

    const result = await sendChatQuery(
      message,
      sessionId,
      signal
    );

    if (signal?.aborted) return;

    const data = result.data || {};
    const answer = String(data.answer || "");

    onStatus?.("Finalizing response...");

    if (answer) {
      onChunk?.(answer);
    }

    onDone?.({
      ...data,
      session_id: data.conversation_id || sessionId || null,
    });

    return result;
  } catch (error) {
    if (axios.isCancel(error) || signal?.aborted) {
      return;
    }

    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Unable to process your request.";

    onError?.(errorMessage);
    throw error;
  }
};

// --------------------------------------------------
// DASHBOARD  
// --------------------------------------------------

export const getDashboardData = (params = {}) =>
  quenzaApi.get("/dashboard", { params });

// --------------------------------------------------
// DASHBOARD FILTERS
// --------------------------------------------------

export const getDashboardFilters = (params = {}) =>
  quenzaApi.get("/dashboard/filters", { params });

// --------------------------------------------------
// AI INSIGHTS  
// --------------------------------------------------

export const getDashboardInsights = (params = {}) =>
  quenzaApi.get("/insights", { params });

// --------------------------------------------------
// CHAT HISTORY 
// --------------------------------------------------

export const getHistorySessions = () =>
  quenzaApi.get("/history");

export const getSessionMessages = (sessionId) =>
  quenzaApi.get(`/history/${encodeURIComponent(sessionId)}/messages`);

export const deleteSession = (sessionId) =>
  quenzaApi.delete(`/history/${encodeURIComponent(sessionId)}`);

export const renameSession = (sessionId, title) =>
  quenzaApi.patch(`/history/${encodeURIComponent(sessionId)}`, {
    title,
  });
  
// --------------------------------------------------
// DEFAULT EXPORT
// --------------------------------------------------

export default quenzaApi;
