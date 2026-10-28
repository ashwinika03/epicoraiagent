import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sun,
  Moon,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { getMe } from "../services/api";

import "./SettingsPage.css";

export default function SettingsPage({ onNavigate, theme, setTheme }) {
  const { logout } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ---------------------------------------------------------
  // Load current user information
  // ---------------------------------------------------------

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getMe();
        const data = response.data;

        setUser(data);
      } catch (err) {
        console.error("Failed to load settings:", err);

        setError(
          err?.response?.data?.detail ||
            "Unable to load your settings."
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  // ---------------------------------------------------------
  // Theme
  // ---------------------------------------------------------

  const handleThemeChange = (newTheme) => {
    if (newTheme !== "dark" && newTheme !== "light") return;

    // Update React global theme
    setTheme(newTheme);

    // Apply immediately to the whole application
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);

    document.documentElement.classList.remove(
      "theme-light",
      "theme-dark"
    );

    document.documentElement.classList.add(`theme-${newTheme}`);

    document.body.classList.remove(
      "theme-light",
      "theme-dark"
    );

    document.body.classList.add(`theme-${newTheme}`);

    // Save selected theme
    localStorage.setItem("epicor-theme", newTheme);

    setMessage(
      `${newTheme === "dark" ? "Dark" : "Light"} theme selected.`
    );
  };

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div
        className={`settings-page ${theme}`}
        data-theme={theme}
      >
        <div className="settings-loading">
          Loading settings...
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Page
  // ---------------------------------------------------------

  return (
    <div
      className={`settings-page ${theme}`}
      data-theme={theme}
    >
      {/* Header */}

      <header className="settings-header">
        <button
          type="button"
          className="settings-back-button"
          onClick={() => onNavigate("dashboard")}
        >
          <ArrowLeft size={18} />
          
        </button>

        <div>
          <h1>Settings</h1>

          <p>
            Manage your application preferences.
          </p>
        </div>
      </header>

      {/* Messages */}

      {message && (
        <div className="settings-message success">
          <CheckCircle2 size={18} />

          <span>{message}</span>

          <button
            type="button"
            className="message-close"
            onClick={() => setMessage("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="settings-message error">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            type="button"
            className="message-close"
            onClick={() => setError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <main className="settings-content">

        {/* =================================================
            APPEARANCE
        ================================================= */}

        <section className="settings-card">
          <div className="settings-card-header">

            <div className="settings-icon appearance-icon">
              {theme === "dark" ? (
                <Moon size={20} />
              ) : (
                <Sun size={20} />
              )}
            </div>

            <div>
              <h2>Appearance</h2>

              <p>
                Choose how Epicor AI Agent looks on your device.
              </p>
            </div>

          </div>

          <div className="appearance-options">

            {/* Dark Theme */}

            <button
              type="button"
              className={`theme-option ${
                theme === "dark" ? "selected" : ""
              }`}
              onClick={() => handleThemeChange("dark")}
            >
              <div className="theme-option-icon dark-icon">
                <Moon size={20} />
              </div>

              <div className="theme-option-content">
                <strong>Dark</strong>

                <span>
                  Use the dark interface
                </span>
              </div>

              {theme === "dark" && (
                <CheckCircle2
                  size={19}
                  className="theme-check"
                />
              )}
            </button>

            {/* Light Theme */}

            <button
              type="button"
              className={`theme-option ${
                theme === "light" ? "selected" : ""
              }`}
              onClick={() => handleThemeChange("light")}
            >
              <div className="theme-option-icon light-icon">
                <Sun size={20} />
              </div>

              <div className="theme-option-content">
                <strong>Light</strong>

                <span>
                  Use the light interface
                </span>
              </div>

              {theme === "light" && (
                <CheckCircle2
                  size={19}
                  className="theme-check"
                />
              )}
            </button>

          </div>
        </section>

        {/* =================================================
            SIGN OUT
        ================================================= */}

        <section className="settings-card logout-card">

          <div>
            <h2>Log Out</h2>

            <p>
              Log out of your Epicor AI Agent account
              on this device.
            </p>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut size={17} />
            Log Out
          </button>

        </section>

      </main>

      {/* =================================================
          LOGOUT CONFIRMATION
      ================================================= */}

      {showLogoutConfirm && (
        <div className="logout-modal-overlay">

          <div className="logout-modal">

            <div className="logout-modal-icon">
              <LogOut size={22} />
            </div>

            <h2>Log out?</h2>

            <p>
              Are you sure you want to Log out of your
              Epicor AI Agent account?
            </p>

            <div className="logout-modal-actions">

              <button
                type="button"
                className="logout-cancel-button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="logout-confirm-button"
                onClick={confirmLogout}
              >
                Log Out
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
