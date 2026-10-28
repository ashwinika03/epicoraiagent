import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

const AuthContext = createContext(null);

// TEMPORARY DEMO LOGIN
// Later this will be replaced with Epicor authentication.
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin";

// Creates a temporary token so the demo session
// survives a page refresh.
const makeDemoToken = (username) => {
  const encode = (obj) =>
    btoa(JSON.stringify(obj));

  return [
    encode({
      alg: "none",
      typ: "JWT",
    }),
    encode({
      sub: username,
      exp:
        Math.floor(Date.now() / 1000) +
        60 * 60 * 24 * 365,
    }),
    "demo",
  ].join(".");
};

export function AuthProvider({ children }) {
  // Restore demo login after refresh
  const [token, setToken] = useState(() => {
    const storedToken =
      localStorage.getItem("token");

    if (!storedToken) {
      return null;
    }

    try {
      const payload = JSON.parse(
        atob(storedToken.split(".")[1])
      );

      if (
        payload.exp &&
        payload.exp * 1000 <= Date.now()
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        return null;
      }

      return storedToken;
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    const storedToken =
      localStorage.getItem("token");

    if (!storedToken) {
      return null;
    }

    try {
      const payload = JSON.parse(
        atob(storedToken.split(".")[1])
      );

      return {
        username: payload.sub,
        role: "admin",
      };
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = !!token;

  // --------------------------------------------------
  // DEMO LOGIN
  // --------------------------------------------------

  const login = useCallback(
    async (username, password) => {
      setLoading(true);
      setError(null);

      try {
        if (
          username !== DEMO_USERNAME ||
          password !== DEMO_PASSWORD
        ) {
          throw new Error(
            "Invalid Epicor ID or password."
          );
        }

        const demoToken =
          makeDemoToken(username);

        localStorage.setItem(
          "token",
          demoToken
        );

        setToken(demoToken);

        setUser({
          username,
          role: "admin",
        });

        return {
          success: true,
        };
      } catch (err) {
        const message =
          err?.message ||
          "Login failed. Check your credentials.";

        setError(message);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const logout = useCallback(async () => {
    // Demo mode does not need a backend logout.
    // Simply clear the local session.

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