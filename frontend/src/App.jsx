import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";

import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const { isAuthenticated } = useAuth();

  const [view, setView] = useState("dashboard");

  /*
   * =========================================================
   * GLOBAL THEME
   * Dark is the default.
   * The selected theme is saved across the whole application.
   * =========================================================
   */
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";

    const savedTheme = window.localStorage.getItem("epicor-theme");

    return savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : "dark";
  });

  /*
   * Save theme globally and apply it to the document.
   */
  useEffect(() => {
    localStorage.setItem("epicor-theme", theme);

    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);

    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${theme}`);

    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  /*
   * Keep theme synchronized if another component/tab changes it.
   */
  useEffect(() => {
    const handleStorage = (event) => {
      if (
        event.key === "epicor-theme" &&
        (event.newValue === "light" || event.newValue === "dark")
      ) {
        setTheme(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((current) =>
      current === "dark" ? "light" : "dark"
    );
  };

  /*
   * =========================================================
   * AUTHENTICATED USER
   * =========================================================
   */
  if (isAuthenticated) {
    if (view === "settings") {
      return (
        <div className={`app-theme ${theme}`}>
          <SettingsPage
            onNavigate={setView}
            theme={theme}
            setTheme={setTheme}
            toggleTheme={toggleTheme}
          />
        </div>
      );
    }

    if (view === "chat") {
      return (
        <div className={`app-theme ${theme}`}>
          <Chat
            theme={theme}
            onNavigate={setView}
          />
        </div>
      );
    }

    return (
      <div className={`app-theme ${theme}`}>
        <Dashboard
          onNavigate={setView}
          theme={theme}
          setTheme={setTheme}
          toggleTheme={toggleTheme}
        />
      </div>
    );
  }

  /*
   * =========================================================
   * CHAT
   * =========================================================
   */
  if (view === "chat") {
    return (
      <div className={`app-theme ${theme}`}>
        <Chat
          theme={theme}
          onNavigate={setView}
        />
      </div>
    );
  }

  /*
   * =========================================================
   * LOGIN
   * =========================================================
   */
  return (
    <div className={`app-theme ${theme}`}>
      <LoginPage theme={theme} />
    </div>
  );
}
