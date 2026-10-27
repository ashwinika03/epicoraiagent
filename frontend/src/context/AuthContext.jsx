import { createContext, useContext, useState, useCallback } from "react";
import {
  login as loginApi,
  logout as logoutApi,
  verifyTwoFactorLogin as verifyTwoFactorLoginApi,
} from "../services/api";

const AuthContext = createContext(null);

// TEMP (frontend-only testing): hardcoded demo credentials.
// Replace with orchestrator-based verification later.
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin";

// TEMP: builds a fake, long-lived JWT so the existing token-expiry check
// in this file keeps working without a backend.
const makeDemoToken = (username) => {
  const encode = (obj) => btoa(JSON.stringify(obj));
  return [
    encode({ alg: "none", typ: "JWT" }),
    encode({
      sub: username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    }),
    "demo",
  ].join(".");
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
  const storedToken = localStorage.getItem("token");

  if (!storedToken) return null;

  try {
    const payload = JSON.parse(atob(storedToken.split(".")[1]));

    // Check whether JWT has expired
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      return null;
    }

    return storedToken;
  } catch {
    // Invalid/malformed token
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    return null;
  }
});

const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const isAuthenticated = !!token;

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      // TEMP: local credential check instead of calling the backend.
      // Remove this block and restore the loginApi call below when the
      // orchestrator-based verification is ready.
      if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
        const demoToken = makeDemoToken(username);
        localStorage.setItem("token", demoToken);
        setToken(demoToken);
        setUser({ username, role: "admin" });
        return { requires_2fa: false };
      }
      throw new Error("Invalid Epicor ID or password.");

      // eslint-disable-next-line no-unreachable
      const res = await loginApi(username, password);
      const data = res.data;

      // Password is correct, but Authenticator 2FA is required.
      // Do not store a JWT yet.
      if (data.requires_2fa) {
        return {
          requires_2fa: true,
          challenge: data.two_factor_challenge,
          message:
            data.message ||
            "Enter the 6-digit code from your authenticator app.",
        };
      }

      // Normal login when 2FA is disabled.
      const {
        access_token,
        refresh_token,
        username: returnedUsername,
        role,
      } = data;

      if (!access_token) {
        throw new Error("Login response did not contain an access token.");
      }

      localStorage.setItem("token", access_token);

      if (refresh_token) {
        localStorage.setItem("refresh_token", refresh_token);
      }

      setToken(access_token);

      setUser({
        username: returnedUsername,
        role,
      });

      return {
        requires_2fa: false,
      };
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Login failed. Check your credentials.";

      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeTwoFactorLogin = useCallback(
    async (challenge, otp) => {
      setLoading(true);
      setError(null);

      try {
        const res = await verifyTwoFactorLoginApi(
          challenge,
          otp
        );

        const data = res.data;

        if (!data.access_token) {
          throw new Error(
            "Two-factor verification did not return an access token."
          );
        }

        localStorage.setItem("token", data.access_token);

        if (data.refresh_token) {
          localStorage.setItem(
            "refresh_token",
            data.refresh_token
          );
        }

        setToken(data.access_token);

        setUser({
          username: data.username,
          role: data.role,
        });

        return {
          requires_2fa: false,
        };
      } catch (err) {
        const msg =
          err.response?.data?.detail ||
          "Invalid authenticator code.";

        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Best effort. Clear local authentication even if the API fails.
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");

    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        login,
        completeTwoFactorLogin,
        logout,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return ctx;
};
