/*
 * TEMP (frontend-only testing): local mock backend.
 *
 * Active when VITE_USE_MOCK is not "false" (see .env.example). Every API
 * call is answered here, so the UI works with no FastAPI server and no
 * database. Delete this file and the DEMO_MODE hooks in api.js once the
 * real backend is connected.
 */

export const DEMO_MODE = import.meta.env.VITE_USE_MOCK !== "false";

const NO_DB_NOTE =
  "No database is connected in this frontend test environment";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ---------- in-memory chat history (resets on page reload) ---------- */
let nextId = 1;
const sessions = []; // { id, title, created_at, updated_at, message_count }
const messagesBySession = {}; // id -> [{ id, role, content, sql_query, latency_ms, created_at }]

export function buildMockChatAnswer(question) {
  return (
    `${NO_DB_NOTE}\n\n` +
    `You asked: "${question}"\n\n` +
    "For now this is a placeholder reply so you can test the chat interface."
  );
}

export function recordMockChat(question, sessionId) {
  const now = new Date().toISOString();
  let sid = sessionId;
  let session = sessions.find((s) => String(s.id) === String(sid));

  if (!session) {
    sid = `demo-${nextId++}`;
    session = {
      id: sid,
      title: question.slice(0, 80),
      created_at: now,
      updated_at: now,
      message_count: 0,
    };
    sessions.unshift(session);
    messagesBySession[sid] = [];
  }

  const answer = buildMockChatAnswer(question);
  const messageId = nextId++;

  messagesBySession[sid].push(
    { id: nextId++, role: "user", content: question, sql_query: null, latency_ms: 0, created_at: now },
    { id: messageId, role: "assistant", content: answer, sql_query: null, latency_ms: 0, created_at: now },
  );
  session.message_count = messagesBySession[sid].length;
  session.updated_at = now;

  return {
    answer,
    session_id: sid,
    message_id: messageId,
    sql_query: null,
    data: [],
    column_names: [],
    column_info: [],
    row_count: 0,
    latency_ms: 0,
    attempts: 1,
    result_id: null,
  };
}

/* ---------- axios adapter ---------- */

function route(method, path, config) {
  const body =
    typeof config.data === "string" && config.data
      ? JSON.parse(config.data)
      : config.data || {};
  const params = config.params || {};

  // HEALTH / SCHEMA
  if (path === "/health") {
    return {
      status: "ok",
      database: { connected: false, message: "No database connected (frontend test mode)" },
      schema: { loaded: false, table_count: 0 },
    };
  }
  if (path === "/schema/progress") return { progress: { status: "idle" } };
  if (path === "/schema/overview") return {};

  // CHAT
  if (path === "/chat/query" && method === "post") {
    return recordMockChat(String(body.message || ""), body.session_id);
  }
  if (path === "/chat/feedback") return { success: true };
  if (path === "/chat/execute-history-query") {
    return { data: [], column_names: [], column_info: [], row_count: 0 };
  }
  if (path.startsWith("/chat/export/")) {
    return new Blob([`${NO_DB_NOTE}\n`], { type: "text/plain" });
  }

  // HISTORY
  if (path === "/history/sessions" && method === "get") {
    const offset = Number(params.offset) || 0;
    const limit = Number(params.limit) || 50;
    return { sessions: sessions.slice(offset, offset + limit) };
  }
  if (path === "/history/search") {
    const q = String(params.q || "").toLowerCase();
    return {
      results: sessions.filter((s) => s.title.toLowerCase().includes(q)),
      sessions: sessions.filter((s) => s.title.toLowerCase().includes(q)),
    };
  }
  let m = path.match(/^\/history\/sessions\/([^/]+)\/messages$/);
  if (m) return { messages: messagesBySession[decodeURIComponent(m[1])] || [] };
  m = path.match(/^\/history\/sessions\/([^/]+)\/export\/pdf$/);
  if (m) return new Blob([`${NO_DB_NOTE}\n`], { type: "text/plain" });
  m = path.match(/^\/history\/sessions\/([^/]+)$/);
  if (m && method === "delete") {
    const sid = decodeURIComponent(m[1]);
    const idx = sessions.findIndex((s) => String(s.id) === sid);
    if (idx >= 0) sessions.splice(idx, 1);
    delete messagesBySession[sid];
    return { success: true };
  }

  // DASHBOARD / INSIGHTS
  if (path === "/dashboard/metrics") return { metrics: [] };
  if (path === "/dashboard/summary") return {};
  if (path === "/dashboard/data") return { data: {}, errors: {} };
  if (path.startsWith("/dashboard/chart-data/")) return { data: [] };
  if (path === "/dashboard/insights") return { insights: [] };

  // PROFILE / AUTH
  if (path === "/auth/me") {
    const display = body.display_name;
    return {
      username: "admin",
      display_name: display || "Admin",
      email: body.email || "admin@example.com",
      phone: body.phone || "",
      role: "admin",
    };
  }
  if (path === "/auth/change-password") return { success: true };
  if (path === "/auth/logout") return { success: true };

  // Anything else: harmless empty success so the UI never shows server errors.
  return {};
}

export async function mockAdapter(config) {
  await delay(250);

  const url = String(config.url || "").split("?")[0];
  const path = url.startsWith("/api") ? url.slice(4) : url;
  const method = String(config.method || "get").toLowerCase();

  return {
    data: route(method, path, config),
    status: 200,
    statusText: "OK",
    headers: {},
    config,
    request: {},
  };
}

/* ---------- streaming chat (replaces fetch to /chat/query/stream) ---------- */

export async function mockStreamChat(
  message,
  sessionId,
  { onStatus, onChunk, onDone } = {},
  signal = null,
) {
  onStatus?.("Thinking…");
  await delay(500);
  if (signal?.aborted) return;

  const result = recordMockChat(String(message || ""), sessionId);
  onStatus?.("Finalizing response…");

  const chunks = result.answer.match(/\S+\s*/g) || [result.answer];
  for (const chunk of chunks) {
    if (signal?.aborted) return;
    onChunk?.(chunk);
    await delay(18);
  }

  onDone?.(result);
}
