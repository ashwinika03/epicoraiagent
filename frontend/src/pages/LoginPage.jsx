import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Zap,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import "./LoginPage.css";

export default function LoginPage({ theme }) {
  const {
    login,
    loading,
    error,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await login(username, password);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div
      className={`login-page ${
        theme === "dark" ? "dark" : "light"
      }`}
      style={{
        display: "flex",
        width: "100vw",
        minHeight: "100vh",
        height: "auto",
        visibility: "visible",
        opacity: 1,
      }}
    >
      {/* Left panel */}

      <div className="login-left">
        <motion.div
          className="login-form-wrap"
          initial={{
            opacity: 0,
            y: 30,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Brand */}

          <div className="brand">
            <span className="brand-icon">
              <Zap size={18} />
            </span>

            <span className="brand-name">
              Quenza AI
            </span>
          </div>

          {/* Title */}

          <h1 className="login-title">
            Sign in to Quenza AI
          </h1>

          <p className="login-subtitle">
            Intelligent natural language interface
            for your Epicor ERP data. Access your
            enterprise AI workflows with secure
            authentication.
          </p>

          <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Login error */}

            {error && (
              <motion.div
                className="login-error"
                initial={{
                  opacity: 0,
                  height: 0,
                }}
                animate={{
                  opacity: 1,
                  height: "auto",
                }}
              >
                {error}
              </motion.div>
            )}

            {/* Epicor ID */}

            <label
              className="field-label"
              htmlFor="login-epicor-id"
            >
              EPICOR ID
            </label>

            <div className="input-wrap">
              <User
                size={18}
                className="input-icon"
              />

              <input
                id="login-epicor-id"
                type="text"
                className="input"
                placeholder="Enter your Epicor ID"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="active-users-row">
              <span className="active-users-link">
                Active Users
              </span>
            </div>

            {/* Password */}

            <div className="password-row">
              <label
                className="field-label"
                htmlFor="login-password"
              >
                PASSWORD
              </label>
            </div>

            <div className="input-wrap">
              <Lock
                size={18}
                className="input-icon"
              />

              <input
                id="login-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                className="input"
                placeholder="Password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
              />

              <button
                type="button"
                className="eye-btn"
                onClick={() =>
                  setShowPassword(
                    (prev) => !prev
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* Login button */}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary submit-btn"
              disabled={
                loading ||
                !username ||
                !password
              }
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Demo credentials */}

            <div
              style={{
                marginTop: "12px",
                textAlign: "center",
                fontSize: "12px",
                opacity: 0.7,
              }}
            >
              Demo credentials:{" "}
              <strong>admin / admin</strong>
            </div>

            {/* Legal links */}

            <div className="legal-links">
              <span className="legal-link">
                Terms and Conditions
              </span>

              <span
                className="legal-separator"
                aria-hidden="true"
              >
                ·
              </span>

              <span className="legal-link">
                Privacy Policy
              </span>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}