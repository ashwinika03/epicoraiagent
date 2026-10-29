
/*
 * TEMP (frontend-only testing): local mock backend.
 * Uses fixed demo data without requiring FastAPI or a database.
 */

export const DEMO_MODE = import.meta.env.VITE_USE_MOCK !== "false";

const NO_DB_NOTE =
  "No database is connected in this frontend test environment, so I can't run queries against your Epicor data.";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ---------- In-memory chat history ---------- */

let nextId = 1;
const sessions = [];
const messagesBySession = {};

const SEED_CHATS = [
  ["Show me the top 10 customers", "Sample reply: the top customers would be listed here."],
  ["How many open sales orders are there today?", "Sample reply: the open order count would be shown here."],
  ["List all parts with zero quantity on hand", "Sample reply: the parts list would be shown here."],
  ["What are the total sales in last 6 months?", "Sample reply: monthly sales totals would be shown here."],
  ["AR invoices older than 90 days", "Sample reply: overdue receivables would be listed here."],
  ["Which suppliers have the highest open PO value?", "Sample reply: supplier PO totals would be listed here."],
];

SEED_CHATS.forEach(([question, answer], i) => {
  const id = `seed-${i + 1}`;
  const created = new Date(Date.now() - (i + 1) * 5 * 3600 * 1000).toISOString();

  sessions.push({
    id,
    title: question,
    created_at: created,
    updated_at: created,
    message_count: 2,
  });

  messagesBySession[id] = [
    {
      id: `${id}-u`,
      role: "user",
      content: question,
      sql_query: null,
      latency_ms: 0,
      created_at: created,
    },
    {
      id: `${id}-a`,
      role: "assistant",
      content: `${NO_DB_NOTE}\n\n${answer}`,
      sql_query: null,
      latency_ms: 0,
      created_at: created,
    },
  ];
});

export function buildMockChatAnswer(question) {
  return (
    `${NO_DB_NOTE}\n\n` +
    `You asked: "${question}"\n\n` +
    "In the full application, this question would be converted to a read-only SQL query, " +
    "run against Epicor, and the results would appear here as a table with a summary. " +
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
    {
      id: nextId++,
      role: "user",
      content: question,
      sql_query: null,
      latency_ms: 0,
      created_at: now,
    },
    {
      id: messageId,
      role: "assistant",
      content: answer,
      sql_query: null,
      latency_ms: 0,
      created_at: now,
    }
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

/* ---------- Fixed dashboard demo data ---------- */

const CUSTOMERS = [
  { num: 1001, name: "Acme Industries" },
  { num: 1002, name: "Globex Corporation" },
  { num: 1003, name: "Initech Manufacturing" },
  { num: 1004, name: "Umbrella Logistics" },
  { num: 1005, name: "Stark Components" },
  { num: 1006, name: "Wayne Enterprises" },
  { num: 1007, name: "Hooli Systems" },
  { num: 1008, name: "Soylent Foods" },
];

const SUPPLIERS = [
  { num: 2001, name: "Northwind Metals" },
  { num: 2002, name: "Contoso Plastics" },
  { num: 2003, name: "Fabrikam Castings" },
  { num: 2004, name: "Tailspin Fasteners" },
  { num: 2005, name: "Adventure Works Supply" },
  { num: 2006, name: "Litware Electronics" },
  { num: 2007, name: "Proseware Packaging" },
  { num: 2008, name: "Wingtip Tooling" },
];

const CUSTOMER_BALANCES = [
  980000, 845000, 712000, 655000, 540000, 430000, 318000, 205000,
];

const SUPPLIER_BALANCES = [
  760000, 690000, 585000, 470000, 392000, 301000, 244000, 158000,
];

const partyRows = (parties, balances) =>
  parties.map((party, i) => ({
    PartyNum: party.num,
    PartyName: party.name,
    Balance: balances[i],
  }));

const DUMMY_DASHBOARD_DATA = {
  // FINANCE
  high_value_invoices: {
    column_names: ["Label", "Count"],
    data: [{ Label: "High-value invoices", Count: 42 }],
  },

  largest_open_order: {
    column_names: ["Label", "Amount"],
    data: [{ Label: "Largest open sales order", Amount: 1250000 }],
  },

  open_order_rate: {
    column_names: ["Label", "Rate"],
    data: [{ Label: "Open order rate", Rate: 37.5 }],
  },

  top_customer_revenue: {
    column_names: ["Label", "Revenue"],
    data: [{ Label: "Top customer revenue", Revenue: 4820000 }],
  },

  ar_invoice_balance_customer: {
    column_names: ["PartyNum", "PartyName", "Balance"],
    data: partyRows(CUSTOMERS, CUSTOMER_BALANCES),
  },

  ap_invoice_balance_supplier: {
    column_names: ["PartyNum", "PartyName", "Balance"],
    data: partyRows(SUPPLIERS, SUPPLIER_BALANCES),
  },

  ar_invoice_aging_customer: {
    column_names: ["Customer", "Balance"],
    data: [
      { Customer: "Acme Industries", Balance: 225000 },
      { Customer: "Globex Corporation", Balance: 180000 },
      { Customer: "Initech Manufacturing", Balance: 145000 },
      { Customer: "Umbrella Logistics", Balance: 98000 },
      { Customer: "Stark Components", Balance: 76000 },
    ],
  },

  ap_invoice_aging_supplier: {
    column_names: ["Supplier", "Balance"],
    data: [
      { Supplier: "Northwind Metals", Balance: 195000 },
      { Supplier: "Contoso Plastics", Balance: 162000 },
      { Supplier: "Fabrikam Castings", Balance: 128000 },
      { Supplier: "Tailspin Fasteners", Balance: 84000 },
      { Supplier: "Adventure Works Supply", Balance: 67000 },
    ],
  },

  profit_revenue_year_trend: {
    column_names: ["Year", "Revenue", "Profit"],
    data: [
      { Year: 2021, Revenue: 6100000, Profit: 720000 },
      { Year: 2022, Revenue: 7400000, Profit: 1050000 },
      { Year: 2023, Revenue: 8300000, Profit: 1320000 },
      { Year: 2024, Revenue: 9100000, Profit: 1480000 },
      { Year: 2025, Revenue: 9800000, Profit: 1610000 },
      { Year: 2026, Revenue: 5400000, Profit: 860000 },
    ],
  },

  // SALES
  sales_orders_by_status: {
    column_names: ["Status", "Count"],
    data: [
      { Status: "Open", Count: 128 },
      { Status: "Released", Count: 76 },
      { Status: "Completed", Count: 245 },
      { Status: "Closed", Count: 184 },
    ],
  },

  sales_monthly_revenue: {
    column_names: ["Month", "Revenue"],
    data: [
      { Month: "Jan", Revenue: 420000 },
      { Month: "Feb", Revenue: 465000 },
      { Month: "Mar", Revenue: 510000 },
      { Month: "Apr", Revenue: 480000 },
      { Month: "May", Revenue: 560000 },
      { Month: "Jun", Revenue: 610000 },
    ],
  },

  sales_top_products: {
    column_names: ["Product", "Sales"],
    data: [
      { Product: "Product A", Sales: 185000 },
      { Product: "Product B", Sales: 154000 },
      { Product: "Product C", Sales: 128000 },
      { Product: "Product D", Sales: 97000 },
      { Product: "Product E", Sales: 82000 },
    ],
  },

  // INVENTORY
  inventory_low_stock: {
    column_names: ["Label", "Count"],
    data: [{ Label: "Low stock parts", Count: 23 }],
  },

  inventory_stock_by_warehouse: {
    column_names: ["Warehouse", "Quantity"],
    data: [
      { Warehouse: "Main", Quantity: 4200 },
      { Warehouse: "North", Quantity: 3150 },
      { Warehouse: "South", Quantity: 2680 },
      { Warehouse: "West", Quantity: 1940 },
    ],
  },

  inventory_part_status: {
    column_names: ["Status", "Count"],
    data: [
      { Status: "In Stock", Count: 680 },
      { Status: "Low Stock", Count: 23 },
      { Status: "Out of Stock", Count: 12 },
    ],
  },

  // PRODUCTION
  production_open_jobs: {
    column_names: ["Label", "Count"],
    data: [{ Label: "Open production jobs", Count: 84 }],
  },

  production_jobs_by_status: {
    column_names: ["Status", "Count"],
    data: [
      { Status: "Open", Count: 84 },
      { Status: "In Progress", Count: 46 },
      { Status: "Completed", Count: 172 },
      { Status: "On Hold", Count: 9 },
    ],
  },

  production_output_trend: {
    column_names: ["Month", "Output"],
    data: [
      { Month: "Jan", Output: 820 },
      { Month: "Feb", Output: 910 },
      { Month: "Mar", Output: 875 },
      { Month: "Apr", Output: 960 },
      { Month: "May", Output: 1030 },
      { Month: "Jun", Output: 1080 },
    ],
  },

  // PURCHASING
  purchasing_open_pos: {
    column_names: ["Label", "Count"],
    data: [{ Label: "Open purchase orders", Count: 57 }],
  },

  purchasing_supplier_spend: {
    column_names: ["Supplier", "Spend"],
    data: [
      { Supplier: "Northwind Metals", Spend: 760000 },
      { Supplier: "Contoso Plastics", Spend: 690000 },
      { Supplier: "Fabrikam Castings", Spend: 585000 },
      { Supplier: "Tailspin Fasteners", Spend: 470000 },
      { Supplier: "Litware Electronics", Spend: 301000 },
    ],
  },

  purchasing_lead_time: {
    column_names: ["Label", "Days"],
    data: [{ Label: "Average supplier lead time", Days: 17 }],
  },
};

/* ---------- Demo insights ---------- */

const DUMMY_INSIGHTS = [
  {
    id: "ins-1",
    title: "Open sales orders are up this month",
    description:
      "There are 128 open sales orders, 12% more than last month, mostly from your top 5 customers.",
    category: "Sales",
    severity: "info",
    badge: "Trend",
    updated: "Updated 5 min ago",
    ask: "Show me the open sales orders from the top 5 customers",
    trend_direction: "up",
    trend_percent: 12,
  },
  {
    id: "ins-2",
    title: "Overdue receivables need attention",
    description:
      "$525K of AR invoices are more than 60 days past due across 9 customers.",
    category: "Finance",
    severity: "warning",
    badge: "Attention",
    updated: "Updated 12 min ago",
    ask: "Which customers have invoices overdue by more than 60 days?",
    trend_direction: "up",
    trend_percent: 8.4,
  },
  {
    id: "ins-3",
    title: "Parts with zero stock on hand",
    description:
      "23 active parts currently show zero quantity on hand and have open demand.",
    category: "Inventory",
    severity: "danger",
    badge: "Critical",
    updated: "Updated 20 min ago",
    ask: "List all parts with zero quantity on hand",
    trend_direction: "up",
    trend_percent: 4.5,
  },
  {
    id: "ins-4",
    title: "Production throughput is on target",
    description:
      "Job completion rate is 96% this week, in line with the monthly target.",
    category: "Production",
    severity: "success",
    badge: "On track",
    updated: "Updated 1 hour ago",
    ask: "Show job completion rate for this week",
    trend_direction: "flat",
    trend_percent: 0,
  },
  {
    id: "ins-5",
    title: "Supplier lead times are slipping",
    description:
      "Average purchase order lead time rose from 14 to 17 days over the last quarter.",
    category: "Purchasing",
    severity: "warning",
    badge: "Watch",
    updated: "Updated 2 hours ago",
    ask: "Show average lead time by supplier for the last quarter",
    trend_direction: "up",
    trend_percent: 21.4,
  },
  {
    id: "ins-6",
    title: "Revenue is ahead of last year",
    description:
      "Year-to-date revenue is $5.4M, 9% above the same period last year.",
    category: "Sales",
    severity: "success",
    badge: "Positive",
    updated: "Updated 3 hours ago",
    ask: "What are the total sales in last 6 months?",
    trend_direction: "up",
    trend_percent: 9,
  },
];

/* ---------- Dashboard data helpers ---------- */

function buildDashboardData(params = {}) {
  const only = params.chart_id;
  const keys = only ? [only] : Object.keys(DUMMY_DASHBOARD_DATA);
  const data = {};

  keys.forEach((key) => {
    const source = DUMMY_DASHBOARD_DATA[key];
    if (!source) return;

    let rows = source.data;

    const picked = String(params.customer || params.supplier || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (picked.length && rows[0] && "PartyNum" in rows[0]) {
      rows = rows.filter((row) => picked.includes(String(row.PartyNum)));
    }

    data[key] = { ...source, data: rows };
  });

  return { data, errors: {} };
}

function buildPartyOptions(params = {}) {
  const list = params.party_type === "supplier" ? SUPPLIERS : CUSTOMERS;
  const query = String(params.q || "").toLowerCase();

  const options = list
    .filter(
      (party) =>
        party.name.toLowerCase().includes(query) ||
        String(party.num).includes(query)
    )
    .map((party) => ({
      value: String(party.num),
      label: `${party.name} (#${party.num})`,
      name: party.name,
      num: party.num,
    }));

  return { options, has_more: false, next_cursor: null };
}

/* ---------- Axios mock adapter ---------- */

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
      database: {
        connected: false,
        message: "No database connected (frontend test mode)",
      },
      schema: { loaded: false, table_count: 0 },
    };
  }

  if (path === "/schema/progress") {
    return { progress: { status: "idle" } };
  }

  if (path === "/schema/overview") return {};

  // CHAT
  if (path === "/chat/query" && method === "post") {
    return recordMockChat(String(body.message || ""), body.session_id);
  }

  if (path === "/chat/feedback") return { success: true };

  if (path === "/chat/execute-history-query") {
    return {
      data: [],
      column_names: [],
      column_info: [],
      row_count: 0,
    };
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
    const query = String(params.q || "").toLowerCase();
    const results = sessions.filter((session) =>
      session.title.toLowerCase().includes(query)
    );

    return { results, sessions: results };
  }

  let match = path.match(/^\/history\/sessions\/([^/]+)\/messages$/);

  if (match) {
    return {
      messages: messagesBySession[decodeURIComponent(match[1])] || [],
    };
  }

  match = path.match(/^\/history\/sessions\/([^/]+)\/export\/pdf$/);

  if (match) {
    return new Blob([`${NO_DB_NOTE}\n`], { type: "text/plain" });
  }

  match = path.match(/^\/history\/sessions\/([^/]+)$/);

  if (match && method === "delete") {
    const sessionId = decodeURIComponent(match[1]);
    const index = sessions.findIndex(
      (session) => String(session.id) === sessionId
    );

    if (index >= 0) sessions.splice(index, 1);
    delete messagesBySession[sessionId];

    return { success: true };
  }

  // DASHBOARD / INSIGHTS
  if (path === "/dashboard/metrics") return { metrics: [] };
  if (path === "/dashboard/summary") return {};
  if (path === "/dashboard/data") return buildDashboardData(params);
  if (path === "/dashboard/party-options") return buildPartyOptions(params);

  if (path.startsWith("/dashboard/chart-data/")) {
    const key = decodeURIComponent(path.split("/").pop());
    return DUMMY_DASHBOARD_DATA[key] || { data: [] };
  }

  if (path === "/dashboard/insights") {
    return { insights: DUMMY_INSIGHTS };
  }

  // PROFILE / AUTH
  if (path === "/auth/me") {
    return {
      username: "admin",
      display_name: body.display_name || "Admin",
      email: body.email || "admin@example.com",
      phone: body.phone || "",
      role: "admin",
    };
  }

  if (path === "/auth/change-password") return { success: true };
  if (path === "/auth/logout") return { success: true };

  // Harmless empty success for unimplemented mock endpoints
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

/* ---------- Streaming chat mock ---------- */

export async function mockStreamChat(
  message,
  sessionId,
  { onStatus, onChunk, onDone } = {},
  signal = null
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
