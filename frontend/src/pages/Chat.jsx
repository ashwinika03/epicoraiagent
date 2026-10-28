import { useState, useEffect, useRef, useMemo } from 'react';

import {
  Send, Search, Clock, Sparkles, User,
  BarChart3, Table2, Hash, ChevronDown, AlertCircle, Loader2, Database,
  Terminal, Download, Square, Copy, Check, FileText,
  ThumbsUp, ThumbsDown, Paperclip,
  Plus, MoreVertical, Pin, PinOff, Pencil, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  exportQueryResult,
  executeHistoricalQuery,
  submitChatFeedback,
} from '../services/api';
import './Chat.css';

// >>> CHANGED: icons sized down — these now render as small chips above the
// composer instead of large cards in the empty-state hero.
const SUGGESTIONS = [
  { icon: <BarChart3 size={15} />, text: 'Show me the top 10 customers' },
  { icon: <Table2 size={15} />, text: 'How many open sales orders are there today?' },
  { icon: <Search size={15} />, text: 'List all parts with zero quantity on hand' },
  { icon: <Database size={15} />, text: 'What are the total sales in last 6 months?' },
];

const PROCESSING_STAGES = [
  'Thinking...',
  'Analyzing...',
  'Retrieving data...',
  'Generating response...',
];

// >>> CHANGED: time-based greeting → a rotating set of more interactive,
// conversational lines per time-of-day (instead of a flat "Good
// morning"/"Good night"), personalized with the user's name. A new line
// is picked each time the empty-state hero mounts (new chat / page load).
const GREETING_LINES = {
  night: [
    "Working late? Let's make it count.",
    "Still up? I'm ready whenever you are.",
    "Late-night session — what should we look into?",
  ],
  morning: [
    "Hello, I'm IRA,Ready to turn data into decisions?",
    "Morning! What should we look into first?",
    "Let's get ahead of the day — what do you need?",
  ],
  afternoon: [
    "Let's make this afternoon productive.",
    "Midday check-in — what do you need?",
    "Afternoon! Ask me anything about your data.",
  ],
  evening: [
    "Wrapping up the day? Let's find some answers.",
    "Evening! What's on your mind?",
    "Let's squeeze in a few more answers before you sign off.",
  ],
};

function getTimeSlot() {
  const hour = new Date().getHours();
  if (hour < 5 || hour >= 21) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getGreeting(username) {
  const slot = getTimeSlot();
  const lines = GREETING_LINES[slot];
  const line = lines[Math.floor(Math.random() * lines.length)];
  if (!username) return line;
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  return `${displayName}, ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
}

// >>> ADDED: animated hero greeting — reveals the line word-by-word with a
// staggered fade/slide-in (framer-motion), instead of a static heading.
const greetingContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.055, delayChildren: 0.1 },
  },
};
const greetingWordVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};
function AnimatedGreeting({ text }) {
  const words = text.split(' ');
  return (
    <motion.h2
      key={text}
      variants={greetingContainerVariants}
      initial="hidden"
      animate="visible"
      style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.32em' }}
    >
      {words.map((word, i) => (
        <motion.span key={`${word}-${i}`} variants={greetingWordVariants}>
          {word}
        </motion.span>
      ))}
    </motion.h2>
  );
}

// NOTE: no manual token handling needed here — exportQueryResult() in
// services/api.js uses the same `api` axios instance (and whatever auth
// interceptor it already has) as sendChatQuery, getHealth, etc.

/**
 * Chat page — rendered by Dashboard.jsx when activeTab === 'chat'.
 * All state (messages, input, sending, sessionId...) still lives in
 * Dashboard and is passed down as props, same as the previous ChatTab.
 */
export default function Chat({
  messages,
  input,
  setInput,
  sending,
  handleSend,
  handleKeyDown,
  chatEndRef,
  inputRef,
  sessionId,
  isHistoryChat = false,
  expandedTable,
  setExpandedTable,
  theme,
  user,
  displayName,
  tableCount,
  onStopGenerating,
  onExportPdf,
  exportingSessionId,
  onUpdateMessage,
  onDownloadComplete,
  contextLabel = 'KINETIC DEV',
}) {

  const isExportingThisChat = !!sessionId && exportingSessionId === sessionId;

  // >>> ADDED: frontend-only AI processing stages.
  // Existing streaming/status handling remains untouched; this only controls
  // the visual processing label while a response is being generated.
  const [processingStage, setProcessingStage] = useState(0);

  useEffect(() => {
    if (!sending) {
      // Reset is intentional: brings the label back to the start of the
      // sequence as soon as a response finishes, ready for the next send.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProcessingStage(0);
      return;
    }

    const interval = setInterval(() => {
      setProcessingStage((prev) =>
        prev < PROCESSING_STAGES.length - 1 ? prev + 1 : prev
      );
    }, 1800);

    return () => clearInterval(interval);
  }, [sending]);

  // >>> CHANGED: greeting name now prefers the user's actual display name
  // (full_name set at signup) over `user.username`, since usernames are
  // just the account email under the hood — showing the raw email in the
  // hero greeting looked wrong. Falls back to the local part of the email
  // (before the "@") if no display name is available yet.
  const greetingName = displayName || (user?.username || '').split('@')[0];

  // >>> ADDED: pick the greeting line once per mount (not on every
  // keystroke re-render) so it doesn't flicker/change while typing.
  const greetingText = useMemo(() => getGreeting(greetingName), [greetingName]);

  // >>> ADDED: copy-to-clipboard state for assistant message bubbles
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopyMessage = (idx, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(idx);
      setTimeout(() => {
        setCopiedIndex((cur) => (cur === idx ? null : cur));
      }, 1500);
    });
  };

  const [executingHistoryIndex, setExecutingHistoryIndex] = useState(null);
  const [copiedSqlIndex, setCopiedSqlIndex] = useState(null);

  const handleCopySql = async (idx, sql) => {
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopiedSqlIndex(idx);
      setTimeout(() => setCopiedSqlIndex((cur) => (cur === idx ? null : cur)), 1500);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };

  const handleExecuteHistorical = async (idx, sql) => {
    if (!isHistoryChat || !sessionId || !sql || executingHistoryIndex !== null) return;
    setExecutingHistoryIndex(idx);
    try {
      const res = await executeHistoricalQuery(sessionId, sql);
      onUpdateMessage?.(idx, {
        data: res.data?.data || [],
        columnNames: res.data?.column_names || [],
        columnInfo: res.data?.column_info || [],
        rowCount: res.data?.row_count || 0,
        latency: res.data?.latency_ms || 0,
        resultId: res.data?.result_id || null,
      });
    } catch (err) {
      console.error('Failed to execute historical query:', err);
      alert(err.response?.data?.detail || 'Could not execute this historical query.');
    } finally {
      setExecutingHistoryIndex(null);
    }
  };

  // >>> ADDED: download the whole conversation as a PDF (reuses the
  // session-level export already wired up in Dashboard.jsx)
  // >>> CHANGED: now takes an `includeTable` flag so the user can pick
  // "with table" vs "without table" from the dropdown below.
  // TODO (backend): `onExportPdf` currently ignores the 3rd argument —
  // wire it through once the export endpoint supports the toggle.
  const handleDownloadChat = (includeTable = true) => {
    if (!sessionId || isExportingThisChat) return;
    const firstUserMsg = messages.find((m) => m.role === 'user')?.content;
    onExportPdf?.(sessionId, firstUserMsg || 'Epicor_Copilot_chat', includeTable);
    setShowDownloadMenu(false);
  };

  // >>> ADDED: download dropdown (with table / without table) open state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    if (!showDownloadMenu) return;
    const handleClickOutside = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadMenu]);



  // >>> ADDED: up/down arrow history recall
  const [historyIndex, setHistoryIndex] = useState(-1); // -1 = not navigating
  const [draft, setDraft] = useState('');

  const userHistory = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content);

  const handleComposerKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      if (userHistory.length === 0) return;
      // don't hijack caret movement inside multi-line text
      if (e.target.selectionStart !== 0) return handleKeyDown(e);
      if (historyIndex === -1) setDraft(input); // remember what user was typing
      const newIndex = Math.min(historyIndex + 1, userHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(userHistory[userHistory.length - 1 - newIndex]);
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return handleKeyDown(e);
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? draft : userHistory[userHistory.length - 1 - newIndex]);
      e.preventDefault();
      return;
    }

    // any other key resets history navigation
    if (historyIndex !== -1) setHistoryIndex(-1);
    handleKeyDown(e);
  };

  // >>> ADDED: same export logic as before, now routed through the shared
  // `api` axios instance (exportQueryResult) instead of raw fetch, so auth
  // headers are handled the exact same way as every other API call.
  const handleExport = async (messageId) => {
    try {
      const res = await exportQueryResult(messageId);
      const url = URL.createObjectURL(res.data); // res.data is already a Blob (responseType: 'blob')
      const a = document.createElement('a');
      a.href = url;
      a.download = `epicor_export_${messageId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      onDownloadComplete?.(
        "Download completed",
        "Your query result table has been downloaded successfully."
      );
    } catch {
      // show a toast: "Export expired — try re-running the question."
      alert('Export expired — try re-running the question.');
    }
  };

  // =========================================================
  // FEEDBACK
  // =========================================================

  // >>> ADDED: feedback popover state.
  // Stores the index of the assistant message whose feedback form is open.
  const [feedbackOpenIndex, setFeedbackOpenIndex] = useState(null);

  // >>> ADDED: feedback text entered by the user.
  const [feedbackText, setFeedbackText] = useState('');

  // >>> ADDED: feedback type selected by the user.
  const [feedbackType, setFeedbackType] = useState(null);

  // >>> ADDED: feedback submission/loading state.
  const [feedbackSubmittingIndex, setFeedbackSubmittingIndex] = useState(null);

  // >>> ADDED: keeps track of messages for which feedback was successfully saved.
  const [feedbackSubmitted, setFeedbackSubmitted] = useState({});

  // >>> ADDED: close feedback form when clicking outside.
  const feedbackRef = useRef(null);

  useEffect(() => {
    if (feedbackOpenIndex === null) return;

    const handleClickOutside = (e) => {
      if (
        feedbackRef.current &&
        !feedbackRef.current.contains(e.target)
      ) {
        setFeedbackOpenIndex(null);
        setFeedbackText('');
        setFeedbackType(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, [feedbackOpenIndex]);

  // >>> ADDED: get the actual ChatMessage ID returned by the backend.
  // Different chat response implementations may expose it as message_id,
  // messageId, or id, so we support all three without changing existing data.
  const getFeedbackMessageId = (msg) => {
    return msg?.message_id ?? msg?.messageId ?? msg?.id ?? null;
  };

  // >>> ADDED: submit positive feedback immediately when thumbs up is clicked.
  const handlePositiveFeedback = async (idx, msg) => {
    const messageId = getFeedbackMessageId(msg);

    if (!messageId) {
      console.error('Feedback cannot be submitted: assistant message ID is missing.', msg);
      alert('Unable to submit feedback because the message ID is missing.');
      return;
    }

    if (feedbackSubmitted[idx] || feedbackSubmittingIndex !== null) {
      return;
    }

    setFeedbackSubmittingIndex(idx);

    try {
      await submitChatFeedback(
        messageId,
        'positive',
        null
      );

      setFeedbackSubmitted((current) => ({
        ...current,
        [idx]: 'positive',
      }));

      setFeedbackOpenIndex(null);
      setFeedbackText('');
      setFeedbackType(null);
    } catch (err) {
      console.error('Failed to submit positive feedback:', err);

      alert(
        err.response?.data?.detail ||
        'Unable to save your feedback. Please try again.'
      );
    } finally {
      setFeedbackSubmittingIndex(null);
    }
  };

  // >>> ADDED: thumbs down opens the improvement text area.
  const handleNegativeFeedback = (idx, msg) => {
    const messageId = getFeedbackMessageId(msg);

    if (!messageId) {
      console.error('Feedback cannot be submitted: assistant message ID is missing.', msg);
      alert('Unable to submit feedback because the message ID is missing.');
      return;
    }

    if (feedbackSubmitted[idx]) {
      return;
    }

    setFeedbackType('negative');
    setFeedbackOpenIndex(idx);
    setFeedbackText('');
  };

  // >>> ADDED: paperclip opens the same improvement feedback text area.
  const handleDetailedFeedback = (idx, msg) => {
    const messageId = getFeedbackMessageId(msg);

    if (!messageId) {
      console.error('Feedback cannot be submitted: assistant message ID is missing.', msg);
      alert('Unable to submit feedback because the message ID is missing.');
      return;
    }

    if (feedbackSubmitted[idx]) {
      return;
    }

    setFeedbackType('negative');
    setFeedbackOpenIndex(idx);
    setFeedbackText('');
  };

  // >>> ADDED: submit negative feedback together with improvement text.
  const handleSubmitImprovementFeedback = async (idx, msg) => {
    const messageId = getFeedbackMessageId(msg);

    if (!messageId) {
      console.error('Feedback cannot be submitted: assistant message ID is missing.', msg);
      alert('Unable to submit feedback because the message ID is missing.');
      return;
    }

    const trimmedFeedback = feedbackText.trim();

    if (!trimmedFeedback) {
      return;
    }

    if (feedbackSubmitted[idx] || feedbackSubmittingIndex !== null) {
      return;
    }

    setFeedbackSubmittingIndex(idx);

    try {
      await submitChatFeedback(
        messageId,
        'negative',
        trimmedFeedback
      );

      setFeedbackSubmitted((current) => ({
        ...current,
        [idx]: 'negative',
      }));

      setFeedbackOpenIndex(null);
      setFeedbackText('');
      setFeedbackType(null);
    } catch (err) {
      console.error('Failed to submit improvement feedback:', err);

      alert(
        err.response?.data?.detail ||
        'Unable to save your feedback. Please try again.'
      );
    } finally {
      setFeedbackSubmittingIndex(null);
    }
  };

  // >>> ADDED: close the feedback popover and clear its temporary state.
  const handleCloseFeedback = () => {
    setFeedbackOpenIndex(null);
    setFeedbackText('');
    setFeedbackType(null);
  };

  return (
    <motion.div
      className="aichat"
      data-theme={theme}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      {/* ---- Row 2: page title + status ---- */}
      <div className="aichat-subheader">
        <div className="aichat-subheader-title">
          <span className="aichat-subheader-icon">
            <Sparkles size={20} />
          </span>
          <div>
            <h1>Ask IRA</h1>
          </div>
        </div>
        <div className="aichat-subheader-actions">
          {/* >>> CHANGED: single download button → dropdown with
              "with table" / "without table" options. AI Engine pill removed. */}
          <div className="aichat-download-wrap" ref={downloadMenuRef}>
            <button
              type="button"
              className="aichat-icon-btn"
              onClick={() => setShowDownloadMenu((v) => !v)}
              aria-label="Download chat"
              title="Download chat"
            >
              {isExportingThisChat ? (
                <Loader2 size={16} className="aichat-spin" />
              ) : (
                <Download size={16} />
              )}
            </button>
            <AnimatePresence>
              {showDownloadMenu && (
                <motion.div
                  className="aichat-download-menu"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                >
                  <button
                    type="button"
                    onClick={() => handleDownloadChat(true)}
                    disabled={!sessionId || isExportingThisChat}
                    title={!sessionId ? 'Send a message first' : 'Download with table'}
                  >
                    <Table2 size={14} />
                    Download with table
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadChat(false)}
                    disabled={!sessionId || isExportingThisChat}
                    title={!sessionId ? 'Send a message first' : 'Download without table'}
                  >
                    <FileText size={14} />
                    Download without table
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ---- Conversation ---- */}
      <div className="aichat-body">
        {messages.length === 0 && (
          <div className="aichat-hero">
            <motion.span
              className="aichat-hero-icon"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <BarChart3 size={26} />
            </motion.span>
            <AnimatedGreeting text={greetingText} />
          </div>
        )}

        <div className="aichat-messages">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                className={`aichat-message aichat-message--${msg.role}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="aichat-message-avatar">
                  {msg.role === 'user' ? <User size={15} /> : <Sparkles size={15} />}
                </span>

                <div className="aichat-message-body">
                  {msg.role === 'user' ? (
                    <div className="aichat-bubble aichat-bubble--user">{msg.content}</div>
                  ) : msg.loading ? (
                    <div className="aichat-bubble aichat-bubble--assistant aichat-typing">
                      <span /><span /><span />
                      <span className="aichat-processing-status">
                        {PROCESSING_STAGES[processingStage]}
                      </span>
                    </div>
                  ) : (
                    <div className={`aichat-bubble aichat-bubble--assistant ${msg.isError ? 'is-error' : ''}`}>
                      {msg.isError && <AlertCircle size={15} className="aichat-error-icon" />}
                      <FormattedText text={msg.content} />
                      {msg.streaming && msg.status && (
                        <div className="aichat-processing-status">
                          {msg.status}
                        </div>
                      )}

                      {msg.sql && (
                        <div className="aichat-sql">
                          <div className="aichat-sql-code"><code>{msg.sql}</code></div>

                          {isHistoryChat && (
                            <div className="aichat-sql-actions">
                              <button
                                type="button"
                                className="aichat-sql-action-btn"
                                onClick={() => handleCopySql(i, msg.sql)}
                                title="Copy SQL"
                              >
                                {copiedSqlIndex === i ? <Check size={12} /> : <Copy size={12} />}
                                {copiedSqlIndex === i ? 'Copied' : 'Copy'}
                              </button>

                              <button
                                type="button"
                                className="aichat-sql-action-btn"
                                onClick={() => handleExecuteHistorical(i, msg.sql)}
                                disabled={executingHistoryIndex === i}
                                title="Execute SQL"
                              >
                                {executingHistoryIndex === i ? <Loader2 size={12} className="aichat-spin" /> : <Terminal size={12} />}
                                {executingHistoryIndex === i ? 'Executing' : 'Execute'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.data && msg.data.length > 0 && (
                        <div className="aichat-table-wrapper">
                          <div className="aichat-table-header">
                            <div className="aichat-table-meta">
                              <Table2 size={13} />
                              <span>{msg.rowCount} row{msg.rowCount !== 1 ? 's' : ''}</span>
                              <span className="aichat-meta-divider">·</span>
                              <Clock size={13} />
                              <span>{msg.latency}ms</span>

                              {msg.attempts > 1 && (
                                <>
                                  <span className="aichat-meta-divider">·</span>
                                  <Hash size={13} />
                                  <span>{msg.attempts} attempts (self-healed)</span>
                                </>
                              )}
                            </div>

                            {/* >>> ADDED: export-to-Excel button, only shown
                                when this message actually has a cached
                                result_id from the backend. */}
                            <div className="aichat-table-actions">
                              {msg.resultId && (
                                <button
                                  type="button"
                                  className="aichat-icon-btn aichat-export-btn"
                                  onClick={() => handleExport(msg.resultId)}
                                  aria-label="Export to Excel"
                                  title="Export to Excel"
                                >
                                  <Download size={14} />
                                </button>
                              )}

                              {msg.data.length > 5 && (
                                <button
                                  type="button"
                                  className="aichat-expand-btn"
                                  onClick={() => setExpandedTable(expandedTable === i ? null : i)}
                                >
                                  <ChevronDown
                                    size={14}
                                    style={{
                                      transform: expandedTable === i ? 'rotate(180deg)' : 'rotate(0)',
                                      transition: 'transform 0.2s',
                                    }}
                                  />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="aichat-table-scroll">
                            <table className="aichat-data-table">
                              <thead>
                                <tr>
                                  {msg.columnNames.map((col) => (
                                    <th key={col}>{col}</th>
                                  ))}
                                </tr>
                              </thead>

                              <tbody>
                                {(expandedTable === i || msg.data.length <= 5
                                  ? msg.data
                                  : msg.data.slice(0, 5)
                                ).map((row, ri) => (
                                  <tr key={ri}>
                                    {msg.columnNames.map((col) => (
                                      <td key={col}>
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {msg.data.length > 5 && expandedTable !== i && (
                              <div className="aichat-table-truncated">
                                +{msg.data.length - 5} more rows — click ▼ to expand
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.role === 'assistant' && !msg.loading && (
                    <>
                      <div className="aichat-message-actions">

                        <button
                          type="button"
                          className="aichat-icon-btn aichat-msg-action-btn"
                          onClick={() => handleCopyMessage(i, msg.content)}
                          aria-label="Copy response"
                          title={copiedIndex === i ? 'Copied!' : 'Copy response'}
                        >
                          {copiedIndex === i ? <Check size={13} /> : <Copy size={13} />}
                        </button>

                        {/* =========================================================
                           FEEDBACK BUTTONS
                           ========================================================= */}

                        <div
                          className="aichat-feedback-wrap"
                          ref={feedbackOpenIndex === i ? feedbackRef : null}
                          style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <button
                            type="button"
                            className="aichat-icon-btn aichat-msg-action-btn"
                            onClick={() => handlePositiveFeedback(i, msg)}
                            disabled={
                              feedbackSubmitted[i] ||
                              feedbackSubmittingIndex === i
                            }
                            aria-label="Good response"
                            title={
                              feedbackSubmitted[i] === 'positive'
                                ? 'Feedback submitted'
                                : 'Good response'
                            }
                            style={{
                              opacity:
                                feedbackSubmitted[i] === 'negative'
                                  ? 0.35
                                  : 1,
                              cursor:
                                feedbackSubmitted[i]
                                  ? 'default'
                                  : 'pointer',
                            }}
                          >
                            {feedbackSubmittingIndex === i &&
                            feedbackType === 'positive' ? (
                              <Loader2
                                size={13}
                                className="aichat-spin"
                              />
                            ) : feedbackSubmitted[i] === 'positive' ? (
                              <Check size={13} />
                            ) : (
                              <ThumbsUp size={13} />
                            )}
                          </button>

                          <button
                            type="button"
                            className="aichat-icon-btn aichat-msg-action-btn"
                            onClick={() => handleNegativeFeedback(i, msg)}
                            disabled={
                              feedbackSubmitted[i] ||
                              feedbackSubmittingIndex === i
                            }
                            aria-label="Bad response"
                            title={
                              feedbackSubmitted[i] === 'negative'
                                ? 'Feedback submitted'
                                : 'Bad response'
                            }
                            style={{
                              opacity:
                                feedbackSubmitted[i] === 'positive'
                                  ? 0.35
                                  : 1,
                              cursor:
                                feedbackSubmitted[i]
                                  ? 'default'
                                  : 'pointer',
                            }}
                          >
                            {feedbackSubmitted[i] === 'negative' ? (
                              <Check size={13} />
                            ) : (
                              <ThumbsDown size={13} />
                            )}
                          </button>

                          <button
                            type="button"
                            className="aichat-icon-btn aichat-msg-action-btn"
                            onClick={() => handleDetailedFeedback(i, msg)}
                            disabled={
                              feedbackSubmitted[i] ||
                              feedbackSubmittingIndex === i
                            }
                            aria-label="Give detailed feedback"
                            title={
                              feedbackSubmitted[i]
                                ? 'Feedback submitted'
                                : 'What could be improved?'
                            }
                            style={{
                              opacity: feedbackSubmitted[i] ? 0.35 : 1,
                              cursor: feedbackSubmitted[i]
                                ? 'default'
                                : 'pointer',
                            }}
                          >
                            <Paperclip size={13} />
                          </button>

                          {/* =========================================================
                             FEEDBACK POPOVER
                             ========================================================= */}

                          <AnimatePresence>
                            {feedbackOpenIndex === i && (
                              <motion.div
                                className="aichat-feedback-popover"
                                initial={{
                                  opacity: 0,
                                  y: 6,
                                  scale: 0.98,
                                }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                  y: 6,
                                  scale: 0.98,
                                }}
                                transition={{
                                  duration: 0.15,
                                }}
                                onMouseDown={(e) =>
                                  e.stopPropagation()
                                }
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  bottom: 'calc(100% + 10px)',
                                  width: '340px',
                                  maxWidth: 'calc(100vw - 40px)',
                                  padding: '12px',
                                  borderRadius: '14px',
                                  background:
                                    theme === 'dark'
                                      ? '#1f2937'
                                      : '#ffffff',
                                  border:
                                    theme === 'dark'
                                      ? '1px solid rgba(255,255,255,0.10)'
                                      : '1px solid rgba(0,0,0,0.10)',
                                  boxShadow:
                                    '0 12px 35px rgba(0,0,0,0.18)',
                                  zIndex: 100,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent:
                                      'space-between',
                                    marginBottom: '8px',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      color:
                                        theme === 'dark'
                                          ? '#f3f4f6'
                                          : '#1f2937',
                                    }}
                                  >
                                    What could be improved?
                                  </span>

                                  <button
                                    type="button"
                                    onClick={handleCloseFeedback}
                                    aria-label="Close feedback"
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      fontSize: '16px',
                                      lineHeight: 1,
                                      color:
                                        theme === 'dark'
                                          ? '#9ca3af'
                                          : '#6b7280',
                                      padding: '2px 4px',
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>

                                <textarea
                                  value={feedbackText}
                                  onChange={(e) =>
                                    setFeedbackText(
                                      e.target.value
                                    )
                                  }
                                  placeholder="Tell us what could be improved..."
                                  maxLength={5000}
                                  autoFocus
                                  rows={4}
                                  disabled={
                                    feedbackSubmittingIndex === i
                                  }
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === 'Enter' &&
                                      !e.shiftKey
                                    ) {
                                      e.preventDefault();

                                      if (
                                        feedbackText.trim() &&
                                        feedbackSubmittingIndex ===
                                          null
                                      ) {
                                        handleSubmitImprovementFeedback(
                                          i,
                                          msg
                                        );
                                      }
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    minHeight: '88px',
                                    maxHeight: '180px',
                                    resize: 'vertical',
                                    boxSizing: 'border-box',
                                    borderRadius: '10px',
                                    border:
                                      theme === 'dark'
                                        ? '1px solid rgba(255,255,255,0.12)'
                                        : '1px solid rgba(0,0,0,0.12)',
                                    background:
                                      theme === 'dark'
                                        ? '#111827'
                                        : '#f9fafb',
                                    color:
                                      theme === 'dark'
                                        ? '#f9fafb'
                                        : '#111827',
                                    outline: 'none',
                                    padding: '10px 12px',
                                    fontSize: '13px',
                                    lineHeight: 1.45,
                                    fontFamily:
                                      'inherit',
                                  }}
                                />

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent:
                                      'space-between',
                                    marginTop: '8px',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      color:
                                        theme === 'dark'
                                          ? '#6b7280'
                                          : '#9ca3af',
                                    }}
                                  >
                                    {feedbackText.length}/5000
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSubmitImprovementFeedback(
                                        i,
                                        msg
                                      )
                                    }
                                    disabled={
                                      !feedbackText.trim() ||
                                      feedbackSubmittingIndex ===
                                        i
                                    }
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent:
                                        'center',
                                      gap: '6px',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding:
                                        '7px 12px',
                                      background:
                                        !feedbackText.trim() ||
                                        feedbackSubmittingIndex ===
                                          i
                                          ? theme ===
                                            'dark'
                                            ? '#374151'
                                            : '#e5e7eb'
                                          : theme ===
                                            'dark'
                                          ? '#f3f4f6'
                                          : '#111827',
                                      color:
                                        !feedbackText.trim() ||
                                        feedbackSubmittingIndex ===
                                          i
                                          ? theme ===
                                            'dark'
                                            ? '#6b7280'
                                            : '#9ca3af'
                                          : theme ===
                                            'dark'
                                          ? '#111827'
                                          : '#ffffff',
                                      cursor:
                                        !feedbackText.trim() ||
                                        feedbackSubmittingIndex ===
                                          i
                                          ? 'not-allowed'
                                          : 'pointer',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {feedbackSubmittingIndex ===
                                    i ? (
                                      <>
                                        <Loader2
                                          size={12}
                                          className="aichat-spin"
                                        />
                                        Submitting
                                      </>
                                    ) : (
                                      <>
                                        <Send size={12} />
                                        Submit
                                      </>
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ---- Composer ---- */}
      <div className="aichat-composer">
        {/* >>> ADDED: suggestion chips live here now, tied to the input,
            instead of as cards floating in the empty-state space. Only
            shown before the first message is sent. */}
        {messages.length === 0 && (
          <div className="aichat-suggestion-chips">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                type="button"
                className="aichat-suggestion-chip"
                onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
              >
                {s.icon}
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        )}

        <div className="aichat-input-row">
          <input
            ref={inputRef}
            type="text"
            className="aichat-input"
            placeholder="Ask a question about your Epicor data..."
            value={input}
            // onChange={(e) => setInput(e.target.value)}
            // onKeyDown={handleKeyDown}
            onChange={(e) => { setInput(e.target.value); setHistoryIndex(-1); }}
            onKeyDown={handleComposerKeyDown}
            disabled={sending}
            autoComplete="off"
          />

          <div className="aichat-input-controls">
            <button
              type="button"
              className={`aichat-send-btn ${sending ? 'is-stop' : ''}`}
              onClick={sending ? onStopGenerating : handleSend}
              disabled={!sending && !input.trim()}
              aria-label={sending ? 'Stop generating' : 'Send message'}
              title={sending ? 'Stop generating' : 'Send message'}
            >
              {sending ? <Square size={13} fill="currentColor" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════ Markdown Formatter (moved from Dashboard.jsx, chat-only) ══════ */
function FormattedText({ text }) {
  if (!text) return null;

  const formatLine = (line) => {
    if (!line) return '';

    let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
    formatted = formatted.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    formatted = formatted.replace(/(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g, '<em>$1</em>');
    formatted = formatted.replace(/`(.*?)`/g, '<code class="aichat-inline-code">$1</code>');
    formatted = formatted.replace(/(?<!\d)\*\*(?!\d)/g, '').trim();

    return formatted;
  };

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="aichat-list">
          {currentList.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: formatLine(item) }} />
          ))}
        </ul>
      );

      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[*\-•]\s+(.+)/);
    const numberedMatch = trimmed.match(/^\d+[.)\]]\s+(.+)/);

    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
    } else if (numberedMatch) {
      currentList.push(numberedMatch[1]);
    } else {
      flushList();

      if (trimmed === '') {
        if (elements.length > 0) elements.push(<br key={`br-${idx}`} />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="aichat-text" dangerouslySetInnerHTML={{ __html: formatLine(trimmed) }} />
        );
      }
    }
  });

  flushList();

  return <div className="aichat-formatted">{elements}</div>;
}

/* ════════════════════════════════════════════
   Recents (sidebar) — replaces the old History page.
   Rendered by Dashboard.jsx only while activeTab === "chat".
   ════════════════════════════════════════════ */
const RECENTS_COLLAPSED_LIMIT = 4;
const PINNED_STORAGE_KEY = "epicor-pinned-sessions";

export function RecentsSection({
  sessions,
  loading,
  activeSessionId,
  onSelect,
  onDelete,
  onRename,
  onNewChat,
}) {
  const [expanded, setExpanded] = useState(false);

  // >>> ADDED: pinned session ids, persisted locally so pins survive a
  // refresh. TODO (backend): move this to the session record itself once
  // there's an API field for it — this is a client-only stand-in.
  const [pinnedIds, setPinnedIds] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = window.localStorage.getItem(PINNED_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PINNED_STORAGE_KEY,
        JSON.stringify(Array.from(pinnedIds)),
      );
    } catch {
      /* ignore */
    }
  }, [pinnedIds]);

  const handleTogglePin = (sid) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  // >>> ADDED: which item's 3-dot menu is open, and inline-rename state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const startRename = (session) => {
    setRenamingId(session.id);
    setRenameValue(session.title || "");
    setOpenMenuId(null);
  };

  const confirmRename = (sid) => {
    if (renameValue.trim()) onRename?.(sid, renameValue);
    setRenamingId(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const sorted = (sessions || [])
    .slice()
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const pinnedSessions = sorted.filter((s) => pinnedIds.has(s.id));
  const unpinnedSessions = sorted.filter((s) => !pinnedIds.has(s.id));

  const hasMore = unpinnedSessions.length > RECENTS_COLLAPSED_LIMIT;
  const visibleSessions = expanded
    ? unpinnedSessions
    : unpinnedSessions.slice(0, RECENTS_COLLAPSED_LIMIT);
  const groups = groupSessionsByRecency(visibleSessions);
  if (pinnedSessions.length > 0) {
    groups.unshift({ label: "Pinned", items: pinnedSessions });
  }

  const renderItem = (session) => {
    const isActive = activeSessionId === session.id;
    const isPinned = pinnedIds.has(session.id);
    const isRenaming = renamingId === session.id;
    const isMenuOpen = openMenuId === session.id;

    return (
      <div
        key={session.id}
        className={`recents-item ${isActive ? "active" : ""} ${isPinned ? "is-pinned" : ""}`}
        onClick={() => !isRenaming && onSelect(session.id)}
        title={isRenaming ? undefined : session.title || "Untitled chat"}
      >
        {isRenaming ? (
          <input
            type="text"
            className="recents-rename-input"
            value={renameValue}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmRename(session.id);
              if (e.key === "Escape") cancelRename();
            }}
          />
        ) : (
          <span className="recents-item-title">
            {isPinned && <Pin size={11} className="recents-pin-icon" />}
            {session.title || "Untitled chat"}
          </span>
        )}

        {isRenaming ? (
          <div className="recents-item-actions">
            <button
              type="button"
              className="recents-item-inline-btn"
              title="Save"
              aria-label="Save name"
              onClick={(e) => { e.stopPropagation(); confirmRename(session.id); }}
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              className="recents-item-inline-btn"
              title="Cancel"
              aria-label="Cancel rename"
              onClick={(e) => { e.stopPropagation(); cancelRename(); }}
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="recents-item-menu-wrap" ref={isMenuOpen ? menuRef : null}>
            <button
              type="button"
              className="recents-item-menu-btn"
              title="More options"
              aria-label="More options"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : session.id);
              }}
            >
              <MoreVertical size={14} />
            </button>

            {isMenuOpen && (
              <div className="recents-item-dropdown" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { handleTogglePin(session.id); setOpenMenuId(null); }}>
                  {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                  {isPinned ? "Unpin" : "Pin"}
                </button>
                <button type="button" onClick={() => startRename(session)}>
                  <Pencil size={13} />
                  Rename
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => { setOpenMenuId(null); onDelete(session.id); }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="recents-section">
      <div className="recents-section-header">
        <h4 className="status-section-title">RECENTS</h4>
        <button
          type="button"
          className="recents-new-btn"
          onClick={onNewChat}
          data-tooltip="New chat"
          aria-label="New chat"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className={`recents-list ${expanded ? "is-expanded" : ""}`}>
        {loading ? (
          <div className="recents-empty">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="recents-empty">No conversations yet</div>
        ) : (
          groups.map(
            (group) =>
              group.items.length > 0 && (
                <div className="recents-group" key={group.label}>
                  <span className="recents-group-label">{group.label}</span>
                  {group.items.map(renderItem)}
                </div>
              ),
          )
        )}
      </div>

      {!loading && hasMore && (
        <button
          type="button"
          className="recents-expand-toggle"
          onClick={() => setExpanded((e) => !e)}
        >
          <span>{expanded ? "Show less" : "Show more"}</span>
          <ChevronDown
            size={14}
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.2s",
            }}
          />
        </button>
      )}
    </div>
  );
}

function groupSessionsByRecency(sessions) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  (sessions || []).forEach((s) => {
    const d = new Date(s.updated_at);
    if (d >= startOfToday) groups[0].items.push(s);
    else if (d >= startOfYesterday) groups[1].items.push(s);
    else if (d >= sevenDaysAgo) groups[2].items.push(s);
    else groups[3].items.push(s);
  });

  return groups;
}

/* ══════ Sub-Components ══════ */

// eslint-disable-next-line no-unused-vars
