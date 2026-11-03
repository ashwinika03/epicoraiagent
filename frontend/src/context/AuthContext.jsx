
import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

import {
  login as apiLogin,
  logout as apiLogout,
  setAuthToken,
  clearAuthToken,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [sites, setSites] = useState([]);
  const [groups, setGroups] = useState([]);
  const [queriesAvailable, setQueriesAvailable] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = !!token;

  // --------------------------------------------------
  // REAL BACKEND LOGIN
  // --------------------------------------------------

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiLogin(username, password);
      const data = response.data;

      if (!data?.token) {
        throw new Error("The server did not return an authentication token.");
      }

      // Keep token in memory only.
      setAuthToken(data.token);
      setToken(data.token);

      setUser({
        ...data.user,
        username:
          data.user?.name ||
          data.user?.id ||
          username,
      });

      setCompany(data.company || null);
      setSites(data.sites || []);
      setGroups(data.groups || []);
      setQueriesAvailable(data.queries_available ?? 0);

      return {
        success: true,
        user: data.user,
        company: data.company,
        sites: data.sites || [],
        groups: data.groups || [],
        queriesAvailable: data.queries_available ?? 0,
      };
    } catch (err) {
      clearAuthToken();
      setToken(null);
      setUser(null);

      const status = err.response?.status;
      const serverMessage =
        err.response?.data?.detail ||
        err.response?.data?.message;

      let message =
        serverMessage ||
        err.message ||
        "Login failed. Please try again.";

      if (status === 401) {
        message = "Invalid Epicor ID or password.";
      } else if (status === 403) {
        message = "You are not authorized to access this system.";
      } else if (status === 429) {
        message = "Too many login attempts. Please try again later.";
      }

      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // REAL BACKEND LOGOUT
  // --------------------------------------------------

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiLogout();
      }
    } catch (err) {
      console.error("Backend logout failed:", err);
    } finally {
      clearAuthToken();
      setToken(null);
      setUser(null);
      setCompany(null);
      setSites([]);
      setGroups([]);
      setQueriesAvailable(0);
      setError(null);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        company,
        sites,
        groups,
        queriesAvailable,
        isAuthenticated,
        login,
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
