import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AUTH_EXPIRED_EVENT, api, tokenStore } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  /** True until the stored token (if any) has been checked against the server. */
  initializing: boolean;
  /** True after an explicit logout, so the login page does not send the next user to the previous one's page. */
  loggedOut: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [initializing, setInitializing] = useState(() => tokenStore.get() !== null);

  // Restore the session: ask the server who the stored token belongs to (also catches expired tokens).
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    api.auth
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch(() => tokenStore.clear())
      .finally(() => !cancelled && setInitializing(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // The API layer fires this when any request comes back 401 (token expired, user deactivated...).
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, user: me } = await api.auth.login(email, password);
    tokenStore.set(access_token);
    setLoggedOut(false);
    setUser(me);
    return me;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { access_token, user: me } = await api.auth.signup(name, email, password);
    tokenStore.set(access_token);
    setLoggedOut(false);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setLoggedOut(true);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, loggedOut, login, signup, logout }),
    [user, initializing, loggedOut, login, signup, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
