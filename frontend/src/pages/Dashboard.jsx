import { useState, useEffect, useRef, useCallback ,useMemo} from "react";
import { useAuth } from "../context/AuthContext";
import {
  getHealth,
  getSchemaProgress,
  streamChatQuery,
  getHistorySessions,
  searchHistory,
  getSessionMessages,
  deleteSession,
  getDashboardMetrics,
  exportSessionPdf,
  getDashboardInsights,
  getMe,
  updateProfile,
  changePassword,
} from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Database,
  Activity,
  MessageSquare,
  Clock,
  Zap,
  ChevronDown,
  AlertCircle,
  Loader2,
  BarChart3,
  LayoutGrid,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Factory,
  Truck,
  ClipboardCheck,
  Building2,
  FolderOpen,
  RefreshCw,
  Search,
  Trash2,
  X,
  CheckCircle2,
  Info,
  Bell,
  Settings,
  MessageCircle,
  Columns3,
  ShieldCheck,
  Lightbulb,
  FileDown,
  PanelLeftClose,
  Menu,
  PanelLeftOpen,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import "./Dashboard.css";

const PARTY_FILTER_CLEAR_ALL_STYLES = `
  .party-filter-selected-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .party-filter-clear-all {
    width: 18px;
    height: 18px;
    min-width: 18px;
    padding: 0;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-color, rgba(148, 163, 184, 0.28));
    border-radius: 4px;
    background: var(--card-bg, rgba(255, 255, 255, 0.04));
    color: var(--text-secondary, currentColor);
    cursor: pointer;
    line-height: 1;
  }

  .party-filter-clear-all:hover {
    color: var(--text-primary, currentColor);
    border-color: var(--accent-color, currentColor);
    background: var(--accent-soft, rgba(99, 102, 241, 0.12));
  }
`;
import Chat, { RecentsSection } from "./Chat"; // adjust path if Chat.jsx lives elsewhere
import ProfilePage from "./Profile";
import SettingsPage from "./SettingsPage";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, ReferenceLine, LabelList } from "recharts";
// Category icon map
const CATEGORY_ICONS = {
  Sales: <ShoppingCart size={16} />,
  Finance: <DollarSign size={16} />,
  Inventory: <Package size={16} />,
  Production: <Factory size={16} />,
  Purchasing: <Truck size={16} />,
  HR: <Users size={16} />,
  Quality: <ClipboardCheck size={16} />,
  Company: <Building2 size={16} />,
  Shipping: <Truck size={16} />,
  Other: <FolderOpen size={16} />,
};

// >>> UPDATED: the finance/sales cards fetch through a direct query
// endpoint (BAQ/API/DB) keyed by `queryKey`, instead of an LLM
// NL-to-SQL prompt. All fire in parallel and independently, so one
// slow or failed card never blocks the rest.
//
// `group` decides where the card renders:
//   "stat"  -> compact numeric-only cards, 4 in a row
//   "chart" -> full chart cards, 2 per row
const FINANCE_CHART_CONFIGS = [
  // ── Numeric-only stat cards (row of 4) ──
  
  //{
    //id: "largest-open-order",
    //category: "Sales",
    //title: "Largest Open Sales Order",
    //queryKey: "largest_open_order",
    //kind: "stat",
   // group: "stat",
  //},
  {
    id: "open-order-rate",
    category: "Sales",
    title: "Open Order Rate",
    queryKey: "open_order_rate",
    kind: "percent-stat",
    group: "stat",
  },
  {
    id: "top-customer-revenue",
    category: "Sales",
    title: "Top Customer Revenue",
    queryKey: "top_customer_revenue",
    kind: "stat",
    group: "stat",
  },

  // ── Chart cards (2 per row) ──

  {
    id: "ap-invoice-balance-supplier",
    category: "Finance",
    title: "AP Invoice Balance by Supplier",
    queryKey: "ap_invoice_balance_supplier",
    kind: "hbar",
    group: "chart",
  },
  {
    id: "ar-invoice-aging-customer",
    category: "Finance",
    title: "AR Invoice Aging by Customer",
    queryKey: "ar_invoice_aging_customer",
    kind: "stacked-bar",
    group: "chart",
  },
  
  
  // Sales demo charts
  { id: "sales-orders-by-status", category: "Sales", title: "Sales Orders by Status", queryKey: "sales_orders_by_status", kind: "donut", group: "chart" },
  { id: "sales-monthly-revenue", category: "Sales", title: "Monthly Sales Revenue", queryKey: "sales_monthly_revenue", kind: "line", group: "chart" },
  { id: "sales-top-products", category: "Sales", title: "Top Products by Sales", queryKey: "sales_top_products", kind: "histogram", group: "chart" },
  // Demo cards for Inventory, Production, and Purchasing.
  { id: "inventory-part-status", category: "Inventory", title: "Part Status Breakdown", queryKey: "inventory_part_status", kind: "donut", group: "chart" },
  { id: "production-open-jobs", category: "Production", title: "Open Production Jobs", queryKey: "production_open_jobs", kind: "count-stat", group: "stat" },
  { id: "production-jobs-by-status", category: "Production", title: "Jobs by Status", queryKey: "production_jobs_by_status", kind: "donut", group: "chart" },
  { id: "production-output-trend", category: "Production", title: "Monthly Production Output", queryKey: "production_output_trend", kind: "line", group: "chart" },
  { id: "purchasing-open-pos", category: "Purchasing", title: "Open Purchase Orders", queryKey: "purchasing_open_pos", kind: "count-stat", group: "stat" },
  { id: "purchasing-lead-time", category: "Purchasing", title: "Average Supplier Lead Time", queryKey: "purchasing_lead_time", kind: "days-stat", group: "stat" },
];


export default function Dashboard({
  theme,
  setTheme,
  toggleTheme,
}) {
  const { user, logout } = useAuth();

  // Navigation
  const [activeTab, setActiveTab] = useState("dashboard");
  // Remembers the page the user was on before opening Profile or Settings
  const returnTabRef = useRef("dashboard");
  const openPage = (tab) => {
    if (
      (tab === "profile" || tab === "settings") &&
      activeTab !== "profile" &&
      activeTab !== "settings"
    ) {
      returnTabRef.current = activeTab;
    }
    setActiveTab(tab);
  };
  // Sidebar collapse (icon-only rail)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mobile only: the sidebar becomes a slide-in drawer opened from the top bar.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Profile (rename + change password). displayName is tracked locally
  // (fetched from GET /auth/me) so the sidebar label updates instantly
  // after a rename, without needing changes to AuthContext.
  const [displayName, setDisplayName] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    getMe()
      .then((res) => setDisplayName(res.data?.display_name || null))
      .catch(() => {
        // Non-fatal — sidebar just falls back to the username.
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target)
      ) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  
  
  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');
  // Health
  const [health, setHealth] = useState(null);
  // Schema progress
  const [schemaProgress, setSchemaProgress] = useState(null);
  // Schema overview
  const [schemaOverview, setSchemaOverview] = useState(null);
  // Chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [expandedTable, setExpandedTable] = useState(null);
  // History
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [historySearch, setHistorySearch] = useState("");
  const [isHistoryChat, setIsHistoryChat] = useState(false);
  // Dashboard Metrics
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [activeDashboardCategory, setActiveDashboardCategory] = useState("All");
  // Finance filter state is kept at the dashboard level so Refresh Stats
  // refreshes data without clearing the user's currently applied filters.
  const financeFiltersRef = useRef({});
  const [financeRefreshing, setFinanceRefreshing] = useState(false);
  const [lastDashboardUpdated, setLastDashboardUpdated] = useState(null);
  // Toasts
  const [toasts, setToasts] = useState([]);

  // >>> ADDED: download notifications for the notification bell.
  const [downloadNotifications, setDownloadNotifications] = useState([]);

  const addDownloadNotification = useCallback((title, message) => {
    const notification = {
      id: `download-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title, message, time: new Date().toISOString(), type: "success",
      icon: <FileDown size={16} />, tab: "chat",
    };
    setDownloadNotifications((prev) => [notification, ...prev].slice(0, 50));
  }, []);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const addToast = useCallback((title, message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchDashboardMetrics = useCallback(() => {
    return getDashboardMetrics()
      .then((res) => setDashboardMetrics(res.data))
      .catch(() => {
        addToast(
          "Dashboard Error",
          "Failed to load metrics. The server might be unreachable.",
          "error",
        );
      });
  }, [addToast]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await getHealth();
      setHealth(res.data);
    } catch {
      /* silent */
    }
  }, []);

  // Poll health every 15s
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Fetch Dashboard Metrics on Mount and activeTab change
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardMetrics();
    }
  }, [activeTab, fetchDashboardMetrics]);
  
  // Poll schema progress every 3s
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await getSchemaProgress();
        setSchemaProgress(res.data);
      } catch {
        /* silent */
      }
    };
    fetchProgress();
    const interval = setInterval(fetchProgress, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch schema overview once loaded
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const { default: api } = await import("../services/api");
        const res = await api.get("/schema/overview");
        setSchemaOverview(res.data);
      } catch {
        /* silent */
      }
    };
    if (health?.schema?.loaded) {
      fetchOverview();
    }
  }, [health?.schema?.loaded]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  
  // >>> ADDED: the 9 finance/sales chart cards. `financeCharts` is keyed
  // by config id: { loading, data, error } — each card renders
  // independently off its own entry.
  const [financeCharts, setFinanceCharts] = useState({});
  const financeChartsFetchedRef = useRef(false);

  const fetchDashboardCard = useCallback(async (config, activeFilters = {}) => {
    setFinanceCharts((prev) => ({
      ...prev,
      [config.id]: { ...(prev[config.id] || {}), loading: true, error: null, errorMessage: null },
    }));

    try {
      const { default: api } = await import("../services/api");
      const params = { chart_id: config.queryKey };
      if (activeFilters.customer?.length) params.customer = activeFilters.customer.join(",");
      if (activeFilters.supplier?.length) params.supplier = activeFilters.supplier.join(",");
      if (activeFilters.dateFrom) params.date_from = activeFilters.dateFrom;
      if (activeFilters.dateTo) params.date_to = activeFilters.dateTo;
      if (activeFilters.asOfDate) params.as_of_date = activeFilters.asOfDate;

      const res = await api.get("/dashboard/data", { params });
      const payload = res.data || {};
      const errMsg = payload.errors?.[config.queryKey];
      const data = payload.data?.[config.queryKey] || null;

      if (errMsg) {
        console.error(`[dashboard] ${config.title} failed:`, errMsg);
      }

      setFinanceCharts((prev) => ({
        ...prev,
        [config.id]: {
          loading: false,
          data,
          error: Boolean(errMsg),
          errorMessage: errMsg || null,
        },
      }));
    } catch (err) {
      console.error(`[dashboard] ${config.title} filter request failed:`, err);
      setFinanceCharts((prev) => ({
        ...prev,
        [config.id]: {
          ...(prev[config.id] || {}),
          loading: false,
          error: true,
          errorMessage: err?.message || "Request failed",
        },
      }));
    }
  }, []);

  const fetchDashboardData = useCallback(async (activeFilters = {}) => {
    const hasFilters = Object.values(activeFilters || {}).some((value) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    );
    const loadingState = {};
    FINANCE_CHART_CONFIGS.forEach((cfg) => {
      loadingState[cfg.id] = { loading: true, data: null, error: null };
    });
    setFinanceCharts((prev) => ({ ...prev, ...loadingState }));

    try {
      const { default: api } = await import("../services/api");

      // The original endpoint can return all cards in one request when no
      // filters are active. Once filters are active, each card must receive
      // its own filter parameters so Refresh Stats never falls back to
      // unfiltered data.
      if (!hasFilters) {
        const res = await api.get("/dashboard/data");
        const payload = res.data || {};
        const datasets = payload.data || {};
        const errors = payload.errors || {};
        const next = {};
        FINANCE_CHART_CONFIGS.forEach((cfg) => {
          const errMsg = errors[cfg.queryKey];
          next[cfg.id] = {
            loading: false,
            data: datasets[cfg.queryKey] || null,
            error: Boolean(errMsg),
            errorMessage: errMsg || null,
          };
        });
        setFinanceCharts(next);
      } else {
        await Promise.all(
          FINANCE_CHART_CONFIGS.map((cfg) => fetchDashboardCard(cfg, activeFilters)),
        );
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  }, [fetchDashboardCard]);

  const handleApplyDashboardFilter = useCallback((config, filters) => {
    const nextFilters = { ...filters };
    financeFiltersRef.current = { ...financeFiltersRef.current, [config.id]: nextFilters };
    fetchDashboardCard(config, nextFilters);
  }, [fetchDashboardCard]);

  const retryFinanceDashboard = useCallback((config, activeFilters = {}) => {
    if (config) {
      const filters = financeFiltersRef.current[config.id] || activeFilters || {};
      fetchDashboardCard(config, filters);
    } else {
      fetchDashboardData({});
    }
  }, [fetchDashboardCard, fetchDashboardData]);

  const refreshDashboard = useCallback(async () => {
    setFinanceRefreshing(true);
    try {
      await Promise.all([fetchDashboardMetrics(), fetchHealth()]);
      const currentFilters = financeFiltersRef.current;
      await Promise.all(
        FINANCE_CHART_CONFIGS.map((cfg) =>
          fetchDashboardCard(cfg, currentFilters[cfg.id] || {}),
        ),
      );
      setLastDashboardUpdated(new Date());
    } finally {
      setFinanceRefreshing(false);
    }
  }, [fetchDashboardCard, fetchDashboardMetrics, fetchHealth]);

  useEffect(() => {
    if (!financeChartsFetchedRef.current) {
      financeChartsFetchedRef.current = true;
      fetchDashboardData({}).finally(() => setLastDashboardUpdated(new Date()));
    }
  }, [fetchDashboardData]);

  // >>> ADDED: lets handleStopGenerating tell an in-flight handleSend call
  // to discard its result instead of writing it into the conversation.
  const stopRequestedRef = useRef(false);
  const pendingRecentRef = useRef(null);
  const activeSessionRef = useRef(null);
  // Added for SSE streaming cancellation; existing UI/state remain unchanged.
  const streamAbortControllerRef = useRef(null);
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Capture the session that this request belongs to. A new chat has no
    // session id yet, while an existing chat already has one.
    const requestSessionId = sessionId;
    const requestId = `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Keep the currently active session aligned with the request that was
    // started. If the user switches to another Recent chat while this query
    // is running, handleSelectSession() changes this ref and the old request
    // will no longer be allowed to overwrite the newly selected chat.
    activeSessionRef.current = requestSessionId;

    // Add a temporary Recent item immediately when Send is clicked.
    // Do not wait for the backend to finish and return session_id.
    const pendingRecent = {
      id: `pending-${requestId}`,
      title: text.slice(0, 80),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 1,
      pending: true,
    };

    pendingRecentRef.current = {
      ...pendingRecent,
      requestId,
    };

    setHistorySessions((prev) => {
      const withoutPending = prev.filter(
        (s) => !String(s.id).startsWith("pending-")
      );
      return [pendingRecent, ...withoutPending];
    });

    setIsHistoryChat(false);
    stopRequestedRef.current = false;

    const userMsg = { role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    const loadingId = Date.now();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", loading: true, id: loadingId },
    ]);

    try {
      // Added: only this transport changes. The existing message/session/history
      // update behavior below is preserved, but answer text now arrives progressively.
      streamAbortControllerRef.current = new AbortController();
      let streamedAnswer = "";
      let completedData = null;

      await streamChatQuery(
        text,
        requestSessionId,
        {
          onStatus: (statusMessage) => {
            if (stopRequestedRef.current) return;
            if (activeSessionRef.current !== requestSessionId) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? { ...m, status: statusMessage }
                  : m,
              ),
            );
          },
          onChunk: (chunk) => {
            if (stopRequestedRef.current) return;
            if (activeSessionRef.current !== requestSessionId) return;
            streamedAnswer += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? {
                      ...m,
                      loading: false,
                      content: streamedAnswer,
                      streaming: true,
                    }
                  : m,
              ),
            );
          },
          onDone: (data) => {
            completedData = data;
          },
          onError: (message) => {
            throw new Error(message || "Something went wrong. Please try again.");
          },
        },
        streamAbortControllerRef.current.signal,
      );

      // User hit Stop while this was in flight.
      if (stopRequestedRef.current) return;

      const data = completedData;
      if (!data) {
        throw new Error("Streaming ended before the response was completed.");
      }
      const newSessionId = data.session_id;

      // The request has finished. Replace its temporary Recent entry with
      // the real backend session. This happens even if the user has already
      // switched to another Recent chat.
      const pendingRecent = pendingRecentRef.current;
      if (pendingRecent?.requestId === requestId) {
        pendingRecentRef.current = null;
      }

      setHistorySessions((prev) => {
        const now = new Date().toISOString();
        const title = text.slice(0, 80);

        const withoutOldEntry = prev.filter(
          (s) =>
            String(s.id) !== String(pendingRecent?.id) &&
            String(s.id) !== String(newSessionId)
        );

        return [
          {
            id: newSessionId,
            title,
            created_at: pendingRecent?.created_at || now,
            updated_at: now,
            message_count: 2,
            pending: false,
          },
          ...withoutOldEntry,
        ];
      });

      const requestStillOwnsChat =
        activeSessionRef.current === requestSessionId;

      if (requestStillOwnsChat) {
        setSessionId(newSessionId);
        activeSessionRef.current = newSessionId;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  role: "assistant",
                  loading: false,
                  streaming: false,
                  status: undefined,
                  content: streamedAnswer || m.content || "",
                  // Use the real PostgreSQL ChatMessage ID returned by the backend.
                  // Do NOT use the temporary UI/loading ID for feedback.
                  message_id: data.message_id ?? m.message_id ?? null,
                  sql: data.sql_query,
                  data: data.data,
                  columnNames: data.column_names,
                  columnInfo: data.column_info,
                  rowCount: data.row_count,
                  latency: data.latency_ms,
                  attempts: data.attempts,
                  resultId: data.result_id,
                  timestamp: new Date(),
                }
              : m,
          ),
        );
      }
    } catch (err) {
      if (stopRequestedRef.current) return;

      // If the user switched away, do not put an old request's error into
      // the newly selected conversation.
      const requestStillOwnsChat =
        activeSessionRef.current === requestSessionId;

      const pendingRecent = pendingRecentRef.current;
      if (pendingRecent?.requestId === requestId) {
        pendingRecentRef.current = null;

        // A failed first query is not a real history session, so remove only
        // its temporary Recent item.
        setHistorySessions((prev) =>
          prev.filter((s) => String(s.id) !== String(pendingRecent.id))
        );
      }

      const errMsg =
        err.response?.data?.detail ||
        err.message ||
        "Something went wrong. Please try again.";

      if (requestStillOwnsChat) {
        addToast("Query Error", errMsg, "error");
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loadingId)
            .concat({
              role: "assistant",
              content: errMsg,
              isError: true,
              timestamp: new Date(),
            }),
        );
      }
    } finally {
      streamAbortControllerRef.current = null;
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, sessionId, addToast]);

  // >>> ADDED: "Stop generating" — marks the in-flight request as
  // discardable and immediately swaps the typing bubble for a stopped note.
  const handleStopGenerating = useCallback(() => {
    stopRequestedRef.current = true;
    streamAbortControllerRef.current?.abort();
    streamAbortControllerRef.current = null;
    setSending(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.loading
          ? {
              role: "assistant",
              content: "Response stopped.",
              timestamp: new Date(),
            }
          : m,
      ),
    );
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // >>> ADDED: local rename overrides, persisted to localStorage so a
  // renamed chat title survives re-fetches (tab switches) AND page
  // reloads, even though there's no backend rename endpoint yet.
  // Shape: { [sessionId]: renamedTitle }
  const renameOverridesRef = useRef((() => {
    try {
      return JSON.parse(localStorage.getItem("chatRenameOverrides") || "{}");
    } catch {
      return {};
    }
  })());

  const applyRenameOverrides = useCallback((sessions) => {
    const overrides = renameOverridesRef.current;
    if (!overrides || Object.keys(overrides).length === 0) return sessions;
    return sessions.map((s) =>
      overrides[s.id] ? { ...s, title: overrides[s.id] } : s,
    );
  }, []);

  const loadHistorySessions = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getHistorySessions(50, 0);
      const serverSessions = applyRenameOverrides(res.data.sessions || []);
      setHistorySessions((prev) => {
        const pending = prev.filter((s) => String(s.id).startsWith("pending-"));
        return [...pending, ...serverSessions.filter(
          (serverSession) =>
            !pending.some((p) => String(p.id) === String(serverSession.id))
        )];
      });
    } catch (err) {
      console.error("Failed to load history:", err);
      addToast(
        "History Error",
        "Could not load your past conversations.",
        "error",
      );
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [addToast, applyRenameOverrides]);

  const handleUpdateHistoryMessage = useCallback((index, patch) => {
    setMessages((prev) =>
      prev.map((msg, i) => (i === index ? { ...msg, ...patch } : msg))
    );
  }, []);

  // NOTE: not currently called from any UI element (no search input is
  // wired to it yet) — left in place since it's a working implementation
  // against the real searchHistory API, not deleted.
  // eslint-disable-next-line no-unused-vars
  const handleHistorySearch = useCallback(
    async (query) => {
      if (!query.trim()) {
        loadHistorySessions();
        return;
      }
      setHistoryLoading(true);
      try {
        const res = await searchHistory(query, 20);
        setHistorySessions(applyRenameOverrides(res.data.results || []));
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setHistoryLoading(false);
      }
    },
    [loadHistorySessions, applyRenameOverrides],
  );

  // Load history once when Dashboard mounts. New sessions are inserted into
  // local state immediately after a successful query, so tab switching does
  // not cause unnecessary reloads.
  useEffect(() => {
    loadHistorySessions();
  }, [loadHistorySessions]);

  
  const handleSelectSession = async (sid) => {
    // Mark this chat as the one the user currently wants to see. Any older
    // in-flight query must not overwrite it when that request finishes.
    activeSessionRef.current = sid;

    // If the current chat already has a real session, keep it in Recents and
    // move it to the top immediately before switching away.
    if (sessionId && String(sessionId) !== String(sid)) {
      setHistorySessions((prev) => {
        const now = new Date().toISOString();
        const firstUserMessage =
          messages.find((m) => m.role === "user")?.content || "Chat";
        const messageCount = messages.filter(
          (m) => m.role === "user" || m.role === "assistant"
        ).length;

        const existing = prev.find(
          (s) => String(s.id) === String(sessionId)
        );

        const currentChat = {
          ...(existing || {}),
          id: sessionId,
          title: existing?.title || firstUserMessage.slice(0, 80),
          created_at:
            existing?.created_at ||
            (messages[0]?.timestamp
              ? new Date(messages[0].timestamp).toISOString()
              : now),
          updated_at: now,
          message_count: messageCount,
        };

        const remaining = prev.filter(
          (s) => String(s.id) !== String(sessionId)
        );

        return [currentChat, ...remaining];
      });
    }

    // The selected chat should become usable immediately. The old request
    // may still be running in the background, but it must not control this UI.
    setSending(false);
    setMessages([]);
    setExpandedTable(null);
    setIsHistoryChat(true);
    setSessionId(sid);

    try {
      const res = await getSessionMessages(sid);
      const msgs = (res.data?.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sql: m.sql_query,

        // History stores the query/result metadata, not the table rows.
        // Execute can regenerate the table temporarily.
        data: [],
        columnNames: [],
        columnInfo: [],
        rowCount: 0,

        latency: m.latency_ms || 0,
        timestamp: new Date(m.created_at),
      }));

      // Only apply the loaded messages if the user has not clicked another
      // Recent while this history request was loading.
      if (activeSessionRef.current !== sid) return;

      setSessionId(sid);
      setMessages(msgs);
      setExpandedTable(null);
      setIsHistoryChat(true);
      setActiveTab("chat");
    } catch (err) {
      if (activeSessionRef.current !== sid) return;

      console.error("Failed to load session messages", err);
      addToast(
        "History Error",
        err?.response?.data?.detail || "Could not load this conversation.",
        "error"
      );
    }
  };

  const handleDeleteSession = async (sid) => {
    try {
      await deleteSession(sid);
      setHistorySessions((prev) => prev.filter((s) => s.id !== sid));
      if (renameOverridesRef.current[sid]) {
        const next = { ...renameOverridesRef.current };
        delete next[sid];
        renameOverridesRef.current = next;
        try {
          localStorage.setItem("chatRenameOverrides", JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      if (sessionId === sid) {
        setSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  // >>> ADDED: rename a recent chat's title.
  // TODO (backend): no rename endpoint exists yet — this updates local
  // state AND a localStorage-backed override map, so the renamed title
  // survives tab switches (which re-fetch history) and page reloads.
  // Wire this to a real rename/PATCH API call once one exists — at that
  // point the override map can be removed.
  const handleRenameSession = (sid, newTitle) => {
    const trimmed = (newTitle || "").trim();
    if (!trimmed) return;

    renameOverridesRef.current = { ...renameOverridesRef.current, [sid]: trimmed };
    try {
      localStorage.setItem(
        "chatRenameOverrides",
        JSON.stringify(renameOverridesRef.current),
      );
    } catch {
      // localStorage unavailable — rename still applies for this session
    }

    setHistorySessions((prev) =>
      prev.map((s) => (s.id === sid ? { ...s, title: trimmed } : s)),
    );
  };

  const [exportingSessionId, setExportingSessionId] = useState(null);

  const handleExportSessionPdf = useCallback(
    async (sid, title, includeTable = false) => {
      setExportingSessionId(sid);
      try {
        const res = await exportSessionPdf(sid, includeTable);
        const url = URL.createObjectURL(res.data); // already a Blob (responseType: 'blob')
        const a = document.createElement("a");
        a.href = url;
        const safeTitle = (title || "chat_export")
          .replace(/[^a-z0-9\-_ ]/gi, "")
          .trim()
          .replace(/\s+/g, "_")
          .slice(0, 60);
        a.download = `${safeTitle || "chat_export"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        addDownloadNotification(
          "Download completed",
          includeTable
            ? "Your chat with table has been downloaded successfully."
            : "Your chat without table has been downloaded successfully."
        );
      } catch (err) {
        console.error("Failed to export session PDF:", err);
        addToast(
          "Export Error",
          "Couldn't export this conversation. Please try again.",
          "error",
        );
      } finally {
        setExportingSessionId(null);
      }
    },
    [addToast, addDownloadNotification],
  );

  const tableCount = health?.schema?.table_count || 0;

  // Schema progress derived values
  const isScanning = schemaProgress?.progress?.status === "scanning";
  const scanPercent = schemaProgress?.progress?.progress_percent || 0;
  const scannedTables = schemaProgress?.progress?.scanned_tables || 0;
  const totalScanTables = schemaProgress?.progress?.total_tables || 0;
  const currentScanTable = schemaProgress?.progress?.current_step || "";
  const scanMessage = schemaProgress?.progress?.message || "";

  const initials = (user?.username || "A")[0].toUpperCase();

  const handleStartNewChat = () => {
    activeSessionRef.current = null;
    setMessages([]);
    setSessionId(null);
    setIsHistoryChat(false);
    setExpandedTable(null);
    setInput("");
    setActiveTab("chat");
    // Focus the input once the Chat view has mounted
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // >>> ADDED: "Ask IRA" from an insight card — switches to Chat and
  // prefills the question, same behavior as the empty-state suggestion
  // chips in Chat.jsx (fills the input, doesn't auto-send, keeps any
  // existing conversation intact).
  const handleAskInsight = (question) => {
    setActiveTab("chat");
    setInput(question);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Historical Execute results are runtime-only. Clear table data when the
  // user leaves Chat; the saved input/summary/query remain in history.
  useEffect(() => {
    if (activeTab !== "chat") {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.data && msg.data.length > 0
            ? {
                ...msg,
                data: [],
                columnNames: [],
                columnInfo: [],
                rowCount: 0,
                resultId: null,
              }
            : msg
        )
      );
      setExpandedTable(null);
    }
  }, [activeTab]);
  const mergedDashboardMetrics = useMemo(() => {
  if (!dashboardMetrics?.metrics) return dashboardMetrics;

  const stats = schemaOverview?.stats;
  if (!stats) return dashboardMetrics;

  const updated = dashboardMetrics.metrics.map((m) => {
    if (m.icon === "database") {
      return { ...m, value: stats.total_tables ?? m.value };
    }
    if (m.icon === "columns") {
      return { ...m, value: stats.total_columns ?? m.value };
    }
    return m;
  });

  return { ...dashboardMetrics, metrics: updated };
}, [dashboardMetrics, schemaOverview]);

  return (
    <div className={`dashboard ${theme}`}>
      <style>{PARTY_FILTER_CLEAR_ALL_STYLES}</style>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AnimatePresence>
  {showLogoutConfirm && (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={() => setShowLogoutConfirm(false)}
    >
      <motion.div
        className="modal-card logout-confirm-modal"
        initial={{ opacity: 0, y: 15, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>log out?</h3>

          <button
            type="button"
            className="btn-ghost modal-close-btn"
            onClick={() => setShowLogoutConfirm(false)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            Are you sure you want to logout of your account?
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowLogoutConfirm(false)}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowLogoutConfirm(false);
              logout();
            }}
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
      {/* ── Sidebar ── */}
      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileNavOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <div className="sidebar-logo">
              <Zap size={20} />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h3 className="sidebar-title">Quenza AI</h3>
                <span className="sidebar-version"></span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" onClick={() => setMobileNavOpen(false)}>
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
            title="Dashboard"
          >
            <LayoutGrid size={18} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button
            className={`nav-item ${activeTab === "insights" ? "active" : ""}`}
            onClick={() => setActiveTab("insights")}
            title="AI Insights"
          >
            <Lightbulb size={18} />
            {!sidebarCollapsed && <span>AI Insights</span>}
          </button>
          <button
            className={`nav-item ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
            title="Chat"
          >
            <MessageSquare size={18} />
            {!sidebarCollapsed && <span>Chat</span>}
          </button>
        </nav>

       

        {/* Recents — Chat only */}
        {!sidebarCollapsed && activeTab === "chat" && (
          <RecentsSection
            sessions={historySessions}
            loading={historyLoading}
            activeSessionId={sessionId}
            onSelect={(sid) => {
              setMobileNavOpen(false);
              handleSelectSession(sid);
            }}
            onDelete={handleDeleteSession}
            onRename={handleRenameSession}
            onNewChat={() => {
              setMobileNavOpen(false);
              handleStartNewChat();
            }}
          />
        )}

        {/* User, Theme Toggle & Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className="sidebar-user"
              onClick={() => setShowProfileMenu((s) => !s)}
              aria-haspopup="true"
              aria-expanded={showProfileMenu}
            >
              <div className="sidebar-avatar">{initials}</div>
              {!sidebarCollapsed && (
                <span className="sidebar-username">
                  {capitalize(displayName || user?.username || "administrator")}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  className="profile-dropdown"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="profile-dropdown-header">
                    <div className="sidebar-avatar profile-dropdown-avatar">
                      {initials}
                    </div>
                    <div className="profile-dropdown-header-text">
                      <p className="profile-dropdown-name">
                        {capitalize(
                          displayName || user?.username || "administrator"
                        )}
                      </p>
                      <p className="profile-dropdown-role">
                        {capitalize(user?.role || "user")}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      openPage("profile");
                    }}
                  >
                    <Users size={14} />
                    <span>Profile</span>
                  </button>

                  <button
                  type="button"
                  className="profile-dropdown-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    openPage("settings");
                  }}
                  >
                  <ShieldCheck size={14} />
                  <span>Settings</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
  id="logout-btn"
  className="btn btn-ghost sidebar-logout"
  onClick={() => setShowLogoutConfirm(true)}
  title="Log out"
>
  <LogOut size={16} />
</button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <TopBar
          activeTab={activeTab}
          initials={initials}
          onNavigate={openPage}
          onMenuClick={() => {
            setSidebarCollapsed(false);
            setMobileNavOpen(true);
          }}
          lastDashboardUpdated={lastDashboardUpdated}
          isScanning={isScanning}
          schemaProgress={schemaProgress}
          downloadNotifications={downloadNotifications}
        />

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <DashboardTab
              key="dashboard"
              health={health}
              schemaOverview={schemaOverview}
              tableCount={tableCount}
              isScanning={isScanning}
              scanPercent={scanPercent}
              scannedTables={scannedTables}
              totalScanTables={totalScanTables}
              currentScanTable={currentScanTable}
              scanMessage={scanMessage}
              dashboardMetrics={mergedDashboardMetrics}
              onGoToChat={handleStartNewChat}
              onRefresh={refreshDashboard}
              financeRefreshing={financeRefreshing}
              lastDashboardUpdated={lastDashboardUpdated}
              financeCharts={financeCharts}
              activeCategory={activeDashboardCategory}
              onCategoryChange={setActiveDashboardCategory}
              onRetryFinanceChart={retryFinanceDashboard}
              onApplyDashboardFilter={handleApplyDashboardFilter}
            />
          )}
          {activeTab === "chat" && (
            <Chat
              key="chat"
              messages={messages}
              input={input}
              setInput={setInput}
              sending={sending}
              handleSend={handleSend}
              handleKeyDown={handleKeyDown}
              chatEndRef={chatEndRef}
              inputRef={inputRef}
              sessionId={sessionId}
              isHistoryChat={isHistoryChat}
              expandedTable={expandedTable}
              setExpandedTable={setExpandedTable}
              theme={theme}
              user={user}
              displayName={displayName}
              health={health}
              tableCount={tableCount}
              onNewChat={handleStartNewChat}
              onStopGenerating={handleStopGenerating}
              onExportPdf={handleExportSessionPdf}
              exportingSessionId={exportingSessionId}
              onUpdateMessage={handleUpdateHistoryMessage}
              onDownloadComplete={addDownloadNotification}
            />
          )}
          {activeTab === "insights" && (
            <InsightsTab key="insights" onAskInsight={handleAskInsight} />
          )}
          {activeTab === "profile" && (
  <ProfilePage
    key="profile"
    user={user}
    displayName={displayName}
    onDisplayNameUpdated={setDisplayName}
    onBack={() => setActiveTab(returnTabRef.current)}
    onToast={addToast}
  />
)}

{activeTab === "settings" && (
  <SettingsPage
    key="settings"
    onNavigate={(tab) =>
            setActiveTab(tab === "dashboard" ? returnTabRef.current : tab)
          }
    theme={theme}
    setTheme={setTheme}
    toggleTheme={toggleTheme}
  />
)}
        </AnimatePresence>
      </main>

    </div>
  );
}

// ─── Profile Modal (rename) ────────────────────────────────────────
// NOTE: not currently rendered anywhere in this file — the profile dropdown
// routes to the Profile/Settings tabs instead. Left in place rather than
// deleted since it's fully functional (calls the real updateProfile API);
// re-check whether Profile.jsx duplicates this before removing.
// eslint-disable-next-line no-unused-vars
function ProfileModal({ currentDisplayName, username, role, onClose, onSaved, onError }) {
  const [name, setName] = useState(currentDisplayName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Display name can't be empty.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await updateProfile(trimmed);
      onSaved(res.data?.display_name || trimmed);
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Couldn't update your profile. Try again.";
      setError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <motion.div
        className="modal-card"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Edit Profile</h3>
          <button type="button" className="btn-ghost modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={username || ""} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <input className="form-input" value={capitalizeWord(role || "user")} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How your name appears in the sidebar"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Password Modal (change password) ──────────────────────────────
// NOTE: not currently rendered anywhere in this file — same status as
// ProfileModal above; left in place, not deleted.
// eslint-disable-next-line no-unused-vars
function PasswordModal({ onClose, onSaved, onError }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill in all three fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      onSaved?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Couldn't change your password. Try again.";
      setError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputType = showPw ? "text" : "password";

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <motion.div
        className="modal-card"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Change Password</h3>
          <button type="button" className="btn-ghost modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              className="form-input"
              type={inputType}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type={inputType}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label">Confirm New Password</label>
              <button
                type="button"
                className="form-show-pw-btn"
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <input
              className="form-input"
              type={inputType}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          <p className="form-hint">Must be at least 8 characters.</p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Update Password"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function capitalizeWord(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function TopBar({
  activeTab,
  initials,
  onNavigate,
  onMenuClick,
  lastDashboardUpdated,
  isScanning,
  schemaProgress,
  downloadNotifications,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [insightCount, setInsightCount] = useState(0);
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("readNotificationIds") || "[]");
    } catch {
      return [];
    }
  });
  const notificationRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInsightCount = async () => {
      try {
        const res = await getDashboardInsights();
        if (!cancelled) {
          setInsightCount(Array.isArray(res.data?.insights) ? res.data.insights.length : 0);
        }
      } catch {
        if (!cancelled) setInsightCount(0);
      }
    };

    loadInsightCount();
    const intervalId = setInterval(loadInsightCount, 60000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const notifications = useMemo(() => {
    const items = [];

    if (insightCount > 0) {
      items.push({
        id: `insights-${insightCount}`,
        title: "AI insights available",
        message: `${insightCount} AI insight${insightCount === 1 ? "" : "s"} available to review.`,
        type: "info",
        icon: <Lightbulb size={16} />,
        tab: "insights",
      });
    }

    if (isScanning) {
      items.push({
        id: "schema-scanning",
        title: "Schema analysis in progress",
        message: "Database schema analysis is currently running.",
        type: "info",
        icon: <RefreshCw size={16} />,
        tab: "dashboard",
      });
    } else if (schemaProgress?.progress?.status === "completed") {
      items.push({
        id: "schema-analysis-completed",
        title: "Schema analysis completed",
        message: "Database schema analysis has completed successfully.",
        type: "success",
        icon: <CheckCircle2 size={16} />,
        tab: "dashboard",
      });
    }

    items.push(...downloadNotifications);

    return items;
  }, [insightCount, isScanning, schemaProgress, downloadNotifications]);

  // Only unread notifications are shown in the panel. Once a notification is
  // read (individually or through "Mark all as read"), it disappears from the
  // list instead of remaining as a read history item.
  const unreadNotifications = notifications.filter(
    (item) => !readNotificationIds.includes(item.id)
  );
  const unreadCount = unreadNotifications.length;

  const markAsRead = (id) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id].slice(-50);
      try {
        localStorage.setItem("readNotificationIds", JSON.stringify(next));
      } catch {
        // Non-fatal if localStorage is unavailable.
      }
      return next;
    });
  };

  const markAllAsRead = () => {
    const ids = notifications.map((item) => item.id);
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids])).slice(-50);
      try {
        localStorage.setItem("readNotificationIds", JSON.stringify(next));
      } catch {
        // Non-fatal if localStorage is unavailable.
      }
      return next;
    });
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setShowNotifications(false);
    if (notification.tab && notification.tab !== activeTab) {
      onNavigate(notification.tab);
    }
  };

  const formatNotificationTime = (value) => {
    if (!value) return "Just now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";

    const diff = Math.max(0, now - date.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <header className="global-topbar">
      <button
        type="button"
        className="icon-btn topbar-menu-btn"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        <div className="notification-wrap" ref={notificationRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((open) => !open)}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                className="notification-panel glass-card"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <div className="notification-panel-header">
                  <div>
                    <h3>Notifications</h3>
                    <span>{unreadCount ? `${unreadCount} unread` : "All caught up"}</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="notification-mark-all"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="notification-list">
                  {unreadNotifications.length === 0 ? (
                    <div className="notification-empty">
                      <Bell size={20} />
                      <p>No new notifications</p>
                      <span>You're all caught up.</span>
                    </div>
                  ) : (
                    unreadNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className="notification-item unread"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <span className={`notification-item-icon notification-${notification.type}`}>
                          {notification.icon}
                        </span>
                        <span className="notification-item-body">
                          <span className="notification-item-top">
                            <strong>{notification.title}</strong>
                            <span className="notification-unread-dot" />
                          </span>
                          <span className="notification-item-message">
                            {notification.message}
                          </span>
                          <span className="notification-item-time">
                            {formatNotificationTime(notification.time)}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          className="icon-btn"
          aria-label="Settings"
          onClick={() => onNavigate("settings")}
        >
          <Settings size={18} />
        </button>

        <button
          type="button"
          className="topbar-avatar"
          aria-label="Open profile"
          onClick={() => onNavigate("profile")}
        >
          {initials}
        </button>
      </div>
    </header>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className={`toast toast-${toast.type}`}
          >
            <div className="toast-icon">
              {toast.type === "error" && <AlertCircle size={20} />}
              {toast.type === "warning" && <AlertCircle size={20} />}
              {toast.type === "success" && <CheckCircle2 size={20} />}
              {toast.type === "info" && <Info size={20} />}
            </div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button
              className="toast-close btn-xs"
              onClick={() => onRemove(toast.id)}
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════
   Skeleton Loaders
   ════════════════════════════════════════════ */
// NOTE: not currently used — see the flag above DashboardTab.
// eslint-disable-next-line no-unused-vars
function SkeletonKPI() {
  return (
    <div className="stat-card">
      <div className="stat-icon skeleton skeleton-circle"></div>
      <div
        className="skeleton skeleton-text"
        style={{ width: "60%", marginTop: 14 }}
      ></div>
      <div className="skeleton skeleton-title" style={{ width: "40%" }}></div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Dashboard Tab
   ════════════════════════════════════════════ */

// eslint-disable-next-line no-unused-vars
const METRIC_ICONS = {
  "chat-bubble": MessageSquare,
  database: Database,
  columns: Columns3,
  refresh: Clock,
};

// NOTE: tableCount, scanPercent, currentScanTable, dashboardMetrics, and
// onGoToChat are received here but never rendered. SkeletonKPI, KpiCard,
// StatusCard, METRIC_ICONS, formatNumber, and formatUptime (defined further
// down this file) also have no callers — together this looks like a KPI /
// status card grid that was built but never wired into this component's
// JSX, rather than simple dead code. Left everything in place; nothing
// deleted.
function DashboardTab({
  health,
  schemaOverview,
  // eslint-disable-next-line no-unused-vars
  tableCount,
  isScanning,
  // eslint-disable-next-line no-unused-vars
  scanPercent,
  scannedTables,
  totalScanTables,
  // eslint-disable-next-line no-unused-vars
  currentScanTable,
  scanMessage,
  // eslint-disable-next-line no-unused-vars
  dashboardMetrics,
  // eslint-disable-next-line no-unused-vars
  onGoToChat,
  onRefresh,
  financeRefreshing,
  lastDashboardUpdated,
  financeCharts,
  activeCategory,
  onCategoryChange,
  onRetryFinanceChart,
  onApplyDashboardFilter,
}) {
  // eslint-disable-next-line no-unused-vars
  const stats = schemaOverview?.stats;
  // eslint-disable-next-line no-unused-vars
  const sqlVersion =
    health?.database?.message
      ?.split("\n")[0]
      ?.replace("Connected to SQL Server: ", "") || "—";

  return (
    <motion.div
      className="tab-content"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      <div className="dashboard-content">
        <div className="page-heading-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Monitor your database health, schema analysis progress, and AI
              engine status from a centralized command center.
            </p>
          </div>
        </div>

        {/* Scan progress */}
        {isScanning && (
          <div className="scan-card">
            <div className="scan-header">
              <h2>
                <RefreshCw size={17} className="spin-icon" />
                Schema Scan in Progress
              </h2>
              <span className="pill-deep">Deep Analysis</span>
            </div>
            <p className="scan-copy">
              Our AI engine is currently mapping your database relationships
              and indexing metadata for optimized natural language querying.
            </p>

            
            <div className="scan-footer-row">
              <span>
                {scannedTables.toLocaleString()} /{" "}
                {totalScanTables.toLocaleString()} tables scanned
              </span>
              {scanMessage && (
                <span>
                  <Activity size={13} /> {scanMessage}
                </span>
              )}
            </div>
          </div>
        )}

        <FinanceChartsSection
          activeCategory={activeCategory}
          onCategoryChange={onCategoryChange}
          charts={financeCharts}
          onRetry={onRetryFinanceChart}
          onRefresh={onRefresh}
          refreshing={financeRefreshing}
          lastUpdated={lastDashboardUpdated}
          onApplyFilter={onApplyDashboardFilter}
        />

      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   Finance & Sales Insight Charts (9 cards)
   All finance/sales card data comes from one real-time dashboard API request.
   ════════════════════════════════════════════ */

const FINANCE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#84cc16",
];

// Used by the waterfall (Revenue Leakage & Margin Variance) and the
// profit-line (Revenue & Profit Trend) cards.
const PROFIT_COLOR = "#22c55e"; // green
const LOSS_COLOR = "#ef4444"; // red
const BASE_COLOR = "#6366f1"; // indigo — starting/base bar

function formatMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

// Same "guess the useful columns" heuristic TopProductsChart already uses,
// pulled out here so every finance card can reuse it regardless of what
// column names the AI's SQL happens to come back with.
function detectNumericColumn(row, columnNames) {
  return (
    columnNames.find((c) => typeof row[c] === "number") ||
    columnNames.find((c) => !isNaN(parseFloat(row[c]))) ||
    columnNames[columnNames.length - 1]
  );
}

function detectLabelColumn(columnNames, numericCol) {
  const NAME_HINTS = [
    "name",
    "description",
    "label",
    "title",
    "status",
    "customer",
    "month",
    "period",
    "bucket",
    "date",
  ];
  const ID_HINTS = ["id", "num", "code", "key"];
  const candidates = columnNames.filter((c) => c !== numericCol);
  return (
    candidates.find((c) =>
      NAME_HINTS.some((hint) => c.toLowerCase().includes(hint)),
    ) ||
    candidates.find(
      (c) => !ID_HINTS.some((hint) => c.toLowerCase().endsWith(hint)),
    ) ||
    candidates[0] ||
    columnNames[0]
  );
}

function extractSeries(rows, columnNames) {
  if (!rows || rows.length === 0) return [];
  const numericCol = detectNumericColumn(rows[0], columnNames);
  const labelCol = detectLabelColumn(columnNames, numericCol);
  return rows.map((r) => ({
    name: String(r[labelCol]),
    value: Number(r[numericCol]) || 0,
  }));
}

// ar_invoice_balance_customer / ap_invoice_balance_supplier rows are
// shaped as { PartyNum, PartyName, Balance }. Pull the ID in alongside
// the name/value so the "hbar" chart can show both the party number
// and the balance directly, not just the balance on hover.
function extractPartySeries(rows) {
  if (!rows || rows.length === 0) return [];
  return rows.map((r) => {
    const id = r.PartyNum ?? r.partyNum ?? "";
    const partyName = String(r.PartyName ?? r.partyName ?? "");
    return {
      id,
      partyName,
      name: id ? `${partyName} (#${id})` : partyName,
      value: Number(r.Balance ?? r.balance) || 0,
    };
  });
}

// revenue_leakage_margin_variance rows are always shaped as
// { Category, Value } (Value already signed — negative for cost creep,
// positive for the base price and the final net-margin total), so this
// skips the generic column-guessing and reads them directly.
function extractWaterfallSeries(rows) {
  if (!rows || rows.length === 0) return [];
  return rows.map((r) => ({
    name: String(r.Category ?? r.category ?? ""),
    value: Number(r.Value ?? r.value) || 0,
  }));
}

// Turns signed { name, value } deltas into cumulative waterfall bars:
// each bar's invisible "base" offset plus a visible "value" segment,
// stacked on top of each other. The last row (Realized Net Margin) is
// drawn as a full total bar from zero rather than as a delta.
function buildWaterfallBars(series) {
  let cumulative = 0;
  return series.map((d, i) => {
    const isTotal = i === series.length - 1;
    const positive = d.value >= 0;
    let base;
    if (isTotal) {
      base = 0;
    } else {
      base = positive ? cumulative : cumulative + d.value;
      cumulative += d.value;
    }
    return {
      name: d.name,
      base,
      value: isTotal ? d.value : Math.abs(d.value),
      raw: d.value,
      isTotal,
      positive,
    };
  });
}

// revenue_profit_trend rows are { Month, Revenue, Cost, Profit }. Split
// Profit into two parallel series so the line can render green where
// profit is positive and red where it dips negative — recharts colors a
// whole <Line> at once, so two overlaid lines (one per sign) is how the
// color switch happens at the point the trend crosses zero.
function extractProfitSeries(rows) {
  if (!rows || rows.length === 0) return [];
  return rows.map((r) => {
    const profit = Number(r.Profit ?? r.profit) || 0;
    return {
      name: String(r.Month ?? r.month ?? ""),
      profit,
      pos: profit >= 0 ? profit : null,
      neg: profit < 0 ? profit : null,
    };
  });
}

function getNiceAxisTicks(rows) {
  const values = (rows || [])
    .map((row) => Number(row?.Balance ?? row?.balance ?? row?.value ?? 0))
    .filter((value) => Number.isFinite(value) && value >= 0);

  const maxValue = Math.max(0, ...values);
  if (maxValue === 0) return [0];

  const roughStep = maxValue / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;
  const upper = Math.ceil(maxValue / step) * step;

  return Array.from({ length: Math.round(upper / step) + 1 }, (_, index) => index * step);
}

function FinanceChartBody({ kind, rows, columnNames, tall }) {
  const limit = kind === "line" ? 90 : kind === "donut" ? 6 : 8;
  const series = extractSeries(rows, columnNames).slice(0, limit);
  const chartHeight = tall ? 300 : 210;

  if (kind === "stat") {
    const total = series.reduce((sum, d) => sum + d.value, 0);
    return <p className="finance-stat-value">{formatMoney(total)}</p>;
  }

  if (kind === "days-stat") {
    const days = series.reduce((sum, d) => sum + d.value, 0);
    return <p className="finance-stat-value">{days.toFixed(1)} days</p>;
  }

  if (kind === "count-stat") {
    const count = series.reduce((sum, d) => sum + d.value, 0);
    return <p className="finance-stat-value">{count.toLocaleString()}</p>;
  }

  if (kind === "percent-stat") {
    const pct = series.reduce((sum, d) => sum + d.value, 0);
    return <p className="finance-stat-value">{pct.toFixed(1)}%</p>;
  }

  if (kind === "kpi-trend") {
    const total = series.reduce((sum, d) => sum + d.value, 0);
    return (
      <>
        <p className="finance-kpi-value">{formatMoney(total)}</p>
        <div style={{ width: "100%", height: 80 }}>
          <ResponsiveContainer>
            <BarChart data={series}>
              <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>
    );
  }

  if (kind === "histogram") {
    return (
      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer>
          <BarChart
            data={series}
            barCategoryGap={0}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [v, "Invoices"]} />
            <Bar dataKey="value" fill="#6366f1" barSize={42} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "hbar") {
    const partySeries = extractPartySeries(rows).slice(0, 8);
    return (
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <BarChart
            data={partySeries}
            layout="vertical"
            margin={{ left: 8, right: 56 }}
            barCategoryGap={10}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide tickFormatter={formatMoney} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 10.5 }}
              interval={0}
            />
            <Tooltip
              formatter={(v) => formatMoney(v)}
              labelFormatter={(_, payload) =>
                payload && payload[0]
                  ? `${payload[0].payload.partyName} (#${payload[0].payload.id})`
                  : ""
              }
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#6366f1">
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v) => formatMoney(v)}
                style={{ fontSize: 10.5, fill: "var(--text-secondary)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "donut") {
    return (
      <div style={{ width: "100%", height: 210 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={2}
            >
              {series.map((_, i) => (
                <Cell key={i} fill={FINANCE_COLORS[i % FINANCE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "stacked-bar") {
    const axisTicks = getNiceAxisTicks(rows);
    return (
      <div style={{ width: "100%", height: 380 }}>
        <ResponsiveContainer>
          <BarChart data={series} margin={{ top: 24, right: 18, left: 8, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10.5 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={formatMoney}
              ticks={axisTicks}
              domain={[0, axisTicks[axisTicks.length - 1] || "auto"]}
              allowDecimals={false}
            />
            <Tooltip formatter={(v) => formatMoney(v)} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#6366f1">
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v) => (v ? formatMoney(v) : "")}
                style={{ fontSize: 10.5, fill: "var(--text-secondary)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "line") {
    return (
      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoney} />
            <Tooltip formatter={(v) => formatMoney(v)} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 2.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "waterfall") {
    const bars = buildWaterfallBars(extractWaterfallSeries(rows));
    return (
      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer>
          <BarChart data={bars} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10.5 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoney} />
            <Tooltip
              formatter={(v, key, entry) =>
                key === "value" ? [formatMoney(entry.payload.raw), "Amount"] : null
              }
            />
            {/* Invisible offset so each delta bar "floats" at its
                running-total height. */}
            <Bar dataKey="base" stackId="wf" fill="transparent" />
            <Bar dataKey="value" stackId="wf" radius={[4, 4, 4, 4]}>
              {bars.map((b, i) => (
                <Cell
                  key={i}
                  fill={b.isTotal ? PROFIT_COLOR : b.positive ? BASE_COLOR : LOSS_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "profit-line") {
    const segments = extractProfitSeries(rows).slice(0, 24);
    return (
      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer>
          <LineChart data={segments}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoney} />
            <Tooltip
              formatter={(v, key) =>
                v == null ? null : [formatMoney(v), key === "neg" ? "Loss" : "Profit"]
              }
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="pos"
              stroke={PROFIT_COLOR}
              strokeWidth={2}
              dot={{ r: 3, fill: PROFIT_COLOR, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="neg"
              stroke={LOSS_COLOR}
              strokeWidth={2}
              dot={{ r: 3, fill: LOSS_COLOR, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

    if (kind === "profit-revenue-line") {
    const yearData = (rows || []).map((r) => ({
      Year: String(r.Year ?? r.year ?? ""),
      Revenue: Number(r.Revenue ?? r.revenue) || 0,
      Profit: Number(r.Profit ?? r.profit) || 0,
    }));

    return (
      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer>
          <LineChart data={yearData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="Year"
              tick={{ fontSize: 10 }}
            />

            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={formatMoney}
            />

            <Tooltip
              formatter={(value, name) => [
                formatMoney(value),
                name,
              ]}
            />

            <Legend />

            <Line
              type="monotone"
              dataKey="Revenue"
              name="Revenue"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="Profit"
              name="Profit"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  return null;
}

function FinanceChartCard({ config, state, onRetry, onApplyFilter }) {
  const { title, kind, group, span, queryKey } = config;
  const { loading, data, error, errorMessage } = state || { loading: true };
  const rows = data?.data;
  const isStat = group === "stat";
  const isFull = span === "full";
  const filterConfig = getCardFilterConfig(queryKey);
  const [draft, setDraft] = useState({ customer: [], supplier: [], dateFrom: "", dateTo: "", asOfDate: "" });
  const [applied, setApplied] = useState({ customer: [], supplier: [], dateFrom: "", dateTo: "", asOfDate: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const updateDraft = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const apply = () => {
    setApplied(draft);
    onApplyFilter?.(config, draft);
    setFiltersOpen(false);
  };

  const reset = () => {
    const cleared = { customer: [], supplier: [], dateFrom: "", dateTo: "", asOfDate: "" };
    setDraft(cleared);
    setApplied(cleared);
    onApplyFilter?.(config, cleared);
    setFiltersOpen(false);
  };

  const retry = () => onRetry?.(config, applied);
  const showError = !loading && error;
  const showChart = !loading && !showError && rows && rows.length > 0;

  return (
    <div
      className={`chart-card glass-card finance-chart-card ${isStat ? "finance-stat-card" : ""} ${isFull ? "finance-chart-card-full" : ""}`}
    >
      <div className="finance-card-header">
        {isStat ? (
          <span className="finance-stat-label">{title}</span>
        ) : (
          <h2 className="section-title"><BarChart3 size={16} /> {title}</h2>
        )}
      </div>

      {!isStat && filterConfig && (
        <div className={`finance-filter-container ${filtersOpen ? "is-open" : ""}`}>
          <button
            type="button"
            className={`finance-filter-toggle ${filtersOpen ? "is-open" : ""}`}
            onClick={() => setFiltersOpen((current) => !current)}
            aria-expanded={filtersOpen}
            aria-controls={`finance-filter-panel-${config.id}`}
          >
            <span>Filters</span>
            <ChevronDown size={15} className={`finance-filter-toggle-chevron ${filtersOpen ? "rotate" : ""}`} />
          </button>

          {filtersOpen && (
            <div id={`finance-filter-panel-${config.id}`} className="finance-card-filters">
              {filterConfig.partyType && (
                <PartyFilterDropdown
                  label={filterConfig.partyType === "customer" ? "Customer" : "Supplier"}
                  partyType={filterConfig.partyType}
                  value={draft[filterConfig.partyType]}
                  onChange={(value) => updateDraft(filterConfig.partyType, value)}
                  placeholder={filterConfig.partyType === "customer" ? "All customers" : "All suppliers"}
                />
              )}

              {filterConfig.dateRange && (
                <>
                  <label className="finance-card-filter-field">
                    <span>From</span>
                    <input className="finance-filter-input" type="date" value={draft.dateFrom} onChange={(e) => updateDraft("dateFrom", e.target.value)} />
                  </label>
                  <label className="finance-card-filter-field">
                    <span>To</span>
                    <input className="finance-filter-input" type="date" value={draft.dateTo} onChange={(e) => updateDraft("dateTo", e.target.value)} />
                  </label>
                </>
              )}

              {filterConfig.asOfDate && (
                <label className="finance-card-filter-field">
                  <span>As of</span>
                  <input className="finance-filter-input" type="date" value={draft.asOfDate} onChange={(e) => updateDraft("asOfDate", e.target.value)} />
                </label>
              )}

              <div className="finance-card-filter-actions">
                <button type="button" className="btn-outline btn-sm" onClick={reset}>Reset</button>
                <button type="button" className="btn-primary btn-sm" onClick={apply}>Apply</button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <div className={isStat ? "finance-stat-loading" : "schema-loading"}><Loader2 size={isStat ? 16 : 24} className="animate-spin" /></div>}

      {showError && (
        <div className={isStat ? "finance-stat-empty" : "finance-chart-empty"}>
          <p className={isStat ? "finance-stat-empty-text" : "scan-copy"} title={errorMessage || undefined}>Couldn't load this right now.</p>
          <button type="button" className="btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); retry(); }}><RefreshCw size={13} /> Retry</button>
        </div>
      )}

      {!loading && !error && !rows?.length && (
        <div className={isStat ? "finance-stat-empty" : "finance-chart-empty"}>
          <p className={isStat ? "finance-stat-empty-text" : "scan-copy"}>No data available for the selected filters.</p>
          <button type="button" className="btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); retry(); }}><RefreshCw size={13} /> Retry</button>
        </div>
      )}

      {showChart && (
        <FinanceChartBody kind={kind} rows={rows} columnNames={data.column_names || Object.keys(rows[0])} tall={isFull} />
      )}
    </div>
  );
}

function getCardFilterConfig(queryKey) {
  switch (queryKey) {
    case "ar_invoice_balance_customer":
      return { partyType: "customer", dateRange: true };
    case "ap_invoice_balance_supplier":
      return { partyType: "supplier", dateRange: true };
    case "ar_invoice_aging_customer":
      return { partyType: "customer", asOfDate: true };
    case "ap_invoice_aging_supplier":
      return { partyType: "supplier", asOfDate: true };
    case "profit_revenue_year_trend":
      return { dateRange: true };
    default:
      return null;
  }
}

function PartyFilterDropdown({ label, partyType, value, onChange, placeholder }) {
  const PAGE_SIZE = 100;
  const selectedValues = useMemo(
    () =>
      Array.isArray(value)
        ? value.map((item) => String(item))
        : value
          ? String(value).split(",").map((item) => item.trim()).filter(Boolean)
          : [],
    [value],
  );

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const wrapperRef = useRef(null);
  const requestIdRef = useRef(0);
  const selectedValuesRef = useRef(selectedValues);
 useEffect(() => {
  selectedValuesRef.current = selectedValues;
}, [selectedValues]);

  useEffect(() => {
    const selectedSet = new Set(selectedValues);
    // Syncs the locally cached option objects (with label/metadata) to
    // match the external `value` prop. Needed here rather than derived
    // during render because previously selected items can scroll out of
    // the currently loaded `options` page and would otherwise lose their
    // label text.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedOptions((prev) => {
      const kept = prev.filter((item) => selectedSet.has(String(item.value)));
      const known = new Set(kept.map((item) => String(item.value)));
      const added = options.filter(
        (item) => selectedSet.has(String(item.value)) && !known.has(String(item.value))
      );
      return [...kept, ...added];
    });
  }, [value, options, selectedValues]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const timer = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setLoadingMore(false);
      setOptions([]);
      setCursor(null);
      setHasMore(true);

      try {
        const { default: api } = await import("../services/api");
        const res = await api.get("/dashboard/party-options", {
          params: { party_type: partyType, q: search.trim(), limit: PAGE_SIZE },
        });

        if (requestId !== requestIdRef.current) return;

        const nextOptions = Array.isArray(res.data?.options) ? res.data.options : [];
        setOptions(nextOptions);
        setCursor(res.data?.next_cursor || null);
        setHasMore(Boolean(res.data?.has_more));

        setSelectedOptions((prev) => {
          const merged = [...prev];
          const seen = new Set(merged.map((item) => String(item.value)));
          nextOptions.forEach((item) => {
            if (selectedValuesRef.current.includes(String(item.value)) && !seen.has(String(item.value))) {
              merged.push(item);
              seen.add(String(item.value));
            }
          });
          return merged.filter((item) => selectedValuesRef.current.includes(String(item.value)));
        });
      } catch (err) {
        if (requestId === requestIdRef.current) {
          console.error(`Failed to load ${partyType} options:`, err);
          setOptions([]);
          setCursor(null);
          setHasMore(false);
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, search.trim() ? 220 : 0);

    return () => clearTimeout(timer);
  }, [open, search, partyType]);

  const loadMore = async () => {
    if (!open || loading || loadingMore || !hasMore || !cursor) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);

    try {
      const { default: api } = await import("../services/api");
      const res = await api.get("/dashboard/party-options", {
        params: {
          party_type: partyType,
          q: search.trim(),
          limit: PAGE_SIZE,
          after_name: cursor.name,
          after_num: cursor.num,
        },
      });

      if (requestId !== requestIdRef.current) return;

      const nextOptions = Array.isArray(res.data?.options) ? res.data.options : [];
      setOptions((prev) => {
        const seen = new Set(prev.map((item) => String(item.value)));
        return [...prev, ...nextOptions.filter((item) => !seen.has(String(item.value)))];
      });
      setCursor(res.data?.next_cursor || null);
      setHasMore(Boolean(res.data?.has_more));

      setSelectedOptions((prev) => {
        const merged = [...prev];
        const seen = new Set(merged.map((item) => String(item.value)));
        nextOptions.forEach((item) => {
          if (selectedValues.includes(String(item.value)) && !seen.has(String(item.value))) {
            merged.push(item);
            seen.add(String(item.value));
          }
        });
        return merged;
      });
    } catch (err) {
      if (requestId === requestIdRef.current) console.error(`Failed to load more ${partyType} options:`, err);
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  };

  const handleScroll = (event) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) loadMore();
  };

  const toggleOption = (option) => {
    const optionValue = String(option.value);
    const next = new Set(selectedValues);

    if (next.has(optionValue)) {
      next.delete(optionValue);
      setSelectedOptions((prev) => prev.filter((item) => String(item.value) !== optionValue));
    } else {
      next.add(optionValue);
      setSelectedOptions((prev) =>
        prev.some((item) => String(item.value) === optionValue) ? prev : [...prev, option]
      );
    }

    onChange(Array.from(next));
  };

  const clear = () => {
    setSelectedOptions([]);
    setSearch("");
    onChange([]);
  };

  const selectedCount = selectedValues.length;
  const selectedLabel =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1
        ? (selectedOptions.find((option) => String(option.value) === selectedValues[0])?.label ||
          `1 ${label.toLowerCase()} selected`)
        : `${selectedCount} ${label.toLowerCase()}s selected`;

  return (
    <div className="finance-filter-field party-filter-field" ref={wrapperRef}>
      <span className="finance-filter-label">{label}</span>
      <button
        type="button"
        className={`party-filter-trigger ${open ? "is-open" : ""} ${selectedCount ? "has-value" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="party-filter-trigger-text">{selectedLabel}</span>
        <ChevronDown size={15} className={`party-filter-chevron ${open ? "rotate" : ""}`} />
      </button>

      {open && (
        <div className="party-filter-menu">
          <div className="party-filter-search-wrap">
            <Search size={14} />
            <input
              autoFocus
              className="party-filter-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()} by name or ID...`}
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button type="button" className="party-filter-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>

          <button type="button" className="party-filter-option all-option" onClick={clear}>
            <span>{placeholder}</span>
            {!selectedCount && <Check size={14} />}
          </button>

          <div className="party-filter-selected-summary">
            <span>
              {selectedCount
                ? `${selectedCount} ${label.toLowerCase()}${selectedCount === 1 ? "" : "s"} selected`
                : `Select one or more ${label.toLowerCase()}s`}
            </span>

            {selectedCount > 0 && (
              <button
                type="button"
                className="party-filter-clear-all"
                onClick={clear}
                aria-label={`Uncheck all selected ${label.toLowerCase()}s`}
                title="Uncheck all"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div className="party-filter-options-scroll" onScroll={handleScroll}>
            {loading ? (
              <div className="party-filter-status"><Loader2 size={15} className="animate-spin" /> Loading…</div>
            ) : options.length === 0 ? (
              <div className="party-filter-status">No {label.toLowerCase()} matches found.</div>
            ) : (
              <>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(String(option.value));
                  return (
                    <button
                      type="button"
                      className={`party-filter-option ${isSelected ? "selected" : ""}`}
                      key={`${partyType}-${option.value}`}
                      onClick={() => toggleOption(option)}
                    >
                      <span className={`party-filter-checkbox ${isSelected ? "checked" : ""}`}>
                        {isSelected && <Check size={12} />}
                      </span>
                      <span className="party-filter-option-name">{option.label}</span>
                    </button>
                  );
                })}
                {loadingMore && (
                  <div className="party-filter-status party-filter-loading-more">
                    <Loader2 size={14} className="animate-spin" /> Loading more…
                  </div>
                )}
              </>
            )}
          </div>

          <div className="party-filter-footer">
            {hasMore
              ? `Showing ${options.length.toLocaleString()} loaded. Scroll for more or search ${label.toLowerCase()}.`
              : `Showing all ${options.length.toLocaleString()} matching results.`}
          </div>
        </div>
      )}
    </div>
  );
}

// Pure: takes "now" explicitly instead of reading Date.now() internally, so
// callers rendering with it stay safe from React's render-purity rule.
function formatRelativeTime(value, now) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleString();
}

function FinanceChartsSection({ charts, onRetry, onRefresh, refreshing, lastUpdated, onApplyFilter, activeCategory, onCategoryChange }) {
  const categories = ["All", "Sales", "Finance", "Inventory", "Production", "Purchasing"];
  const visibleConfigs = FINANCE_CHART_CONFIGS.filter((c) => activeCategory === "All" || c.category === activeCategory);
  const statConfigs = visibleConfigs.filter((c) => c.group === "stat");
  const chartConfigs = visibleConfigs.filter((c) => c.group === "chart");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="finance-charts-section">
      <div className="finance-charts-header-row">
        <h2 className="section-title finance-charts-title">
          <Activity size={17} /> {activeCategory === "All" ? "Business Performance Overview" : `${activeCategory} Overview`}
        </h2>
        <div className="finance-refresh-group">
          <span className="finance-last-updated" aria-live="polite">
            {refreshing ? "Refreshing data…" : lastUpdated ? `Updated ${formatRelativeTime(lastUpdated, now)}` : "Not updated yet"}
          </span>
          <button type="button" className="btn-outline" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin-icon" : ""} />
            {refreshing ? "Refreshing…" : "Refresh Stats"}
          </button>
        </div>
      </div>

      <div className="insights-pills dashboard-category-pills" role="group" aria-label="Dashboard category filters">
        {categories.map((cat) => (
          <button key={cat} type="button" className={`insights-pill ${activeCategory === cat ? "active" : ""}`} onClick={() => onCategoryChange?.(cat)}>
            {cat !== "All" && (CATEGORY_ICONS[cat] || <FolderOpen size={14} />)}
            {cat}
          </button>
        ))}
      </div>

      <div className="finance-stats-grid">
        {statConfigs.map((cfg) => (
          <FinanceChartCard
            key={cfg.id}
            config={cfg}
            state={charts?.[cfg.id]}
            onRetry={() => onRetry?.(cfg)}
            onApplyFilter={onApplyFilter}
          />
        ))}
      </div>

      <div className="finance-charts-grid">
        {chartConfigs.map((cfg) => (
          <FinanceChartCard
            key={cfg.id}
            config={cfg}
            state={charts?.[cfg.id]}
            onRetry={() => onRetry?.(cfg)}
            onApplyFilter={onApplyFilter}
          />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Insights Tab — live data from the backend.
   ════════════════════════════════════════════ */
const INSIGHT_SEVERITY_ICON = {
  warning: <AlertCircle size={18} />,
  danger: <AlertCircle size={18} />,
  success: <CheckCircle2 size={18} />,
  info: <Info size={18} />,
};

function getInsightTrend(insight) {
  const direction = String(insight?.trend_direction ?? insight?.trendDirection ?? insight?.trend ?? "").toLowerCase();
  const rawValue = insight?.trend_percent ?? insight?.trendPercent ?? insight?.change_percent ?? insight?.changePercent ?? insight?.trend_value ?? insight?.change;
  const currentValue = Number(insight?.current_value ?? insight?.currentValue);
  const previousValue = Number(insight?.previous_value ?? insight?.previousValue);
  const derivedValue = Number.isFinite(currentValue) && Number.isFinite(previousValue) && previousValue !== 0
    ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
    : null;
  const value = Number.isFinite(Number(rawValue)) ? Number(rawValue) : derivedValue;
  if (!direction && !Number.isFinite(value)) return null;
  const isDown = direction.includes("down") || direction.includes("decrease") || direction.includes("negative") || (Number.isFinite(value) && value < 0);
  const isFlat = direction.includes("flat") || direction.includes("stable") || (Number.isFinite(value) && value === 0);
  const arrow = isFlat ? "→" : isDown ? "↓" : "↑";
  const trendValue = Number.isFinite(value) ? ` ${Math.abs(value).toFixed(1)}%` : "";
  return { arrow, value: trendValue, className: isFlat ? "flat" : isDown ? "down" : "up" };
}

function InsightsTab({ onAskInsight }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchInsights = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    try {
      const res = await getDashboardInsights();
      setInsights(res.data?.insights || []);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
      setError(true);
      setInsights([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount: fetchInsights sets loading/refreshing state
    // synchronously before its first await, which trips this rule, but the
    // pattern itself is correct.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInsights();
  }, [fetchInsights]);

  const categories = ["All", ...Array.from(new Set(insights.map((i) => i.category).filter(Boolean)))];
  const visibleInsights =
    activeCategory === "All"
      ? insights
      : insights.filter((i) => i.category === activeCategory);

  return (
    <motion.div
      className="tab-content"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      <header className="content-heading">
        <div className="content-heading-left">
          <Lightbulb size={20} className="content-heading-icon" />
          <h2>AI insights</h2>
        </div>
        <button
          type="button"
          className="insights-refresh-btn"
          onClick={fetchInsights}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
          Refresh
        </button>
      </header>

      <div className="dashboard-content">
        {loading && (
          <div className="finance-chart-empty">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="finance-chart-empty">
            <p className="scan-copy">Couldn't load insights right now.</p>
            <button type="button" className="btn-outline btn-sm" onClick={fetchInsights}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="insights-pills">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`insights-pill ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat !== "All" && (CATEGORY_ICONS[cat] || <FolderOpen size={14} />)}
                  {cat}
                </button>
              ))}
            </div>

            <div className="insights-feed">
              {visibleInsights.length === 0 ? (
                <div className="finance-chart-empty">
                  <p className="scan-copy">No live insights available yet.</p>
                </div>
              ) : (
                visibleInsights.map((insight) => (
                  <div className="insight-card" key={insight.id}>
                    <div className={`insight-icon severity-${insight.severity}`}>
                      {INSIGHT_SEVERITY_ICON[insight.severity] || <Info size={18} />}
                    </div>
                    <div className="insight-body">
                      <div className="insight-head">
                        <span className="insight-title">{insight.title}</span>
                        <span className={`badge badge-${insight.severity}`}>{insight.badge}</span>
                      </div>
                      <p className="insight-desc">{insight.description}</p>
                      <div className="insight-meta">
                        <span>{insight.category}</span>
                        <span className="insight-meta-dot">·</span>
                        <span>{insight.updated}</span>
                        {getInsightTrend(insight) && (
                          <span className={`insight-trend-indicator ${getInsightTrend(insight).className}`} title="KPI trend">
                            {getInsightTrend(insight).arrow}{getInsightTrend(insight).value}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="insight-ask-btn"
                        onClick={() => onAskInsight?.(insight.ask)}
                      >
                        <MessageCircle size={13} />
                        Ask IRA
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}


function StatusCard({ icon, label, status, detail }) {
  const dotClass =
    status === "connected"
      ? "status-dot-ok"
      : status === "loading"
        ? "status-dot-warn"
        : "status-dot-error";

  return (
    <div className="status-card">
      <div className="status-card-icon">{icon}</div>
      <div className="status-card-info">
        <span className="status-card-label">{label}</span>
        <span className="status-card-detail">{detail}</span>
      </div>
      <div className={`status-dot ${dotClass}`} />
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function KpiCard({ icon, label, value, color }) {
  return (
    <motion.div
      className="kpi-card glass-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="kpi-icon" style={{ color }}>
        {icon}
      </div>
      <div className="kpi-info">
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{label}</span>
      </div>
    </motion.div>
  );
}

/* ══════ Utilities ══════ */
// eslint-disable-next-line no-unused-vars
function formatNumber(num) {
  if (!num) return "—";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

// eslint-disable-next-line no-unused-vars
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}