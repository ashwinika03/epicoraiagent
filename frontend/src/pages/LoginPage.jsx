import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Zap,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { motion } from "framer-motion";
import "./LoginPage.css";

export default function LoginPage({ theme }) {
  const {
    login,
    loading,
    completeTwoFactorLogin,
    error,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [twoFactorChallenge, setTwoFactorChallenge] =
    useState("");
  const [twoFactorOtp, setTwoFactorOtp] = useState("");
  const [twoFactorStep, setTwoFactorStep] =
    useState(false);
  const [twoFactorMessage, setTwoFactorMessage] =
    useState("");
  const [twoFactorError, setTwoFactorError] =
    useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] =
    useState("");

  const validatePassword = (value) => {
    if (!value) {
      return "Password is required.";
    }

    // TEMP (frontend-only testing): allow the demo password.
    if (value === "admin") {
      return "";
    }

    if (value.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!/[A-Z]/.test(value)) {
      return "Include at least one uppercase letter.";
    }

    if (!/[a-z]/.test(value)) {
      return "Include at least one lowercase letter.";
    }

    if (!/[0-9]/.test(value)) {
      return "Include at least one number.";
    }

    if (!/[^A-Za-z0-9]/.test(value)) {
      return "Include at least one special character.";
    }

    return "";
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    if (passwordError) {
      setPasswordError(validatePassword(value));
    }
  };

  const handlePasswordBlur = () => {
    // TEMP (frontend-only testing): password-strength check disabled so the
    // demo password "admin" is accepted. Restore the line below later.
    // setPasswordError(validatePassword(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (twoFactorStep) {
      await handleTwoFactorVerification();
      return;
    }

    if (!username.trim() || !password) {
      return;
    }

    try {
      const result = await login(
        username.trim(),
        password
      );

      if (result?.requires_2fa) {
        if (!result.challenge) {
          setTwoFactorError(
            "The server did not return a valid 2FA challenge. Please log in again."
          );
          return;
        }

        setTwoFactorChallenge(result.challenge);
        setTwoFactorOtp("");
        setTwoFactorError("");
        setTwoFactorMessage(
          result.message ||
            "Enter the current 6-digit code from your authenticator app."
        );
        setTwoFactorStep(true);
        return;
      }

      // AuthContext updates the authentication state.
      // The existing application routing can then render the dashboard.
    } catch {
      // AuthContext stores the backend error.
    }
  };

  const handleTwoFactorVerification = async () => {
    if (!twoFactorChallenge) {
      setTwoFactorError(
        "Your 2FA login session is missing. Please log in again."
      );
      return;
    }

    if (!/^\d{6}$/.test(twoFactorOtp)) {
      setTwoFactorError(
        "Enter the 6-digit code from your authenticator app."
      );
      return;
    }

    try {
      setTwoFactorError("");

      await completeTwoFactorLogin(
        twoFactorChallenge,
        twoFactorOtp
      );

      // Authentication state is now complete.
      // Clear the temporary 2FA state.
      setTwoFactorChallenge("");
      setTwoFactorOtp("");
      setTwoFactorMessage("");
      setTwoFactorStep(false);
    } catch (err) {
      setTwoFactorError(
        err?.response?.data?.detail ||
          "Invalid authenticator code. Please try again."
      );
    }
  };

  const handleBackToPassword = () => {
    setTwoFactorStep(false);
    setTwoFactorChallenge("");
    setTwoFactorOtp("");
    setTwoFactorMessage("");
    setTwoFactorError("");
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
          <div className="brand">
            <span className="brand-icon">
              <Zap size={18} />
            </span>
            <span className="brand-name">
              Quenza AI
            </span>
          </div>

          <h1 className="login-title">
            {twoFactorStep
              ? "Verify your identity"
              : "Sign in to Quenza AI "}
          </h1>

          <p className="login-subtitle">
            {twoFactorStep
              ? "Enter the current 6-digit code from your authenticator app to complete sign in."
              : "Intelligent natural language interface for your Epicor ERP data. Access your enterprise AI workflows with secure authentication."}
          </p>

          <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {!twoFactorStep && error && (
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

            {twoFactorStep ? (
              <>
                <div className="two-factor-login-panel">
                  <div className="two-factor-login-icon">
                    <Smartphone size={28} />
                  </div>

                  <strong>
                    Authenticator verification
                  </strong>

                  <p>
                    Open Google Authenticator or Microsoft
                    Authenticator and enter the current
                    6-digit code.
                  </p>
                </div>

                {twoFactorMessage && (
                  <div className="login-success">
                    <strong>Two-factor authentication</strong>
                    <p>{twoFactorMessage}</p>
                  </div>
                )}

                {twoFactorError && (
                  <div className="login-error">
                    {twoFactorError}
                  </div>
                )}

                <label
                  className="field-label"
                  htmlFor="two-factor-otp"
                >
                  AUTHENTICATOR CODE
                </label>

                <div className="input-wrap">
                  <ShieldCheck
                    size={18}
                    className="input-icon"
                  />

                  <input
                    id="two-factor-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="input two-factor-otp-input"
                    placeholder="123456"
                    value={twoFactorOtp}
                    onChange={(e) =>
                      setTwoFactorOtp(
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    autoFocus
                    maxLength={6}
                  />
                </div>

                <button
                  id="two-factor-submit"
                  type="submit"
                  className="btn btn-primary submit-btn"
                  disabled={
                    loading ||
                    twoFactorOtp.length !== 6
                  }
                >
                  {loading ? (
                    <span className="login-spinner" />
                  ) : (
                    <>
                      Verify &amp; Sign In
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="signup-link"
                  onClick={handleBackToPassword}
                  disabled={loading}
                >
                  Back to password login
                </button>
              </>
            ) : (
              <>
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

                <div className="password-row">
                  <label
                    className="field-label"
                    htmlFor="login-password"
                  >
                    PASSWORD
                  </label>
                </div>

                <div
                  className={`input-wrap ${
                    passwordError
                      ? "input-wrap-error"
                      : ""
                  }`}
                >
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
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    autoComplete="current-password"
                    aria-invalid={!!passwordError}
                    aria-describedby={
                      passwordError
                        ? "password-error"
                        : undefined
                    }
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

                {passwordError && (
                  <p
                    id="password-error"
                    className="field-error"
                    role="alert"
                  >
                    {passwordError}
                  </p>
                )}

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
              </>
            )}
          </form>
        </motion.div>
      </div>
  </div>
  );
}
