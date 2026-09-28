"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import type { SystemUser } from "./types";
import { loginAction, logoutAction, completePasswordChangeAction, getCurrentSession } from "@/app/_actions/auth";
import { invalidateClientCache as clearCache } from "./clientCache";
import { setAuthToken } from "./backend";

interface AuthResult {
  success: boolean;
  mustChangePassword?: boolean;
  user?: SystemUser;
  token?: string;
  error?: string;
}

interface AuthContextType {
  user: SystemUser | null;
  isLoading: boolean;
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<AuthResult>;
  completePasswordChange: (
    userId: string,
    newPassword: string,
    confirmPassword: string,
    rememberMe?: boolean
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateUser: (user: SystemUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function hasPersistentSession(): boolean {
  try { return Boolean(localStorage.getItem("miqat_token") || localStorage.getItem("miqat_auth_user")); }
  catch { return false; }
}

function saveUser(user: SystemUser, rememberMe: boolean): void {
  try {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem("miqat_auth_user");
    storage.setItem("miqat_auth_user", JSON.stringify(user));
  } catch { /* Storage may be unavailable in private browsing. */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authVersion = useRef(0);
  const [user, setUser] = useState<SystemUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const version = authVersion.current;

    getCurrentSession()
      .then((session) => {
        if (!active || version !== authVersion.current) return;
        if (session && !session.mustChangePassword) {
          setUser(session);
          saveUser(session, hasPersistentSession());
        } else {
          setUser(null);
          setAuthToken(null);
          try {
            localStorage.removeItem("miqat_auth_user");
            sessionStorage.removeItem("miqat_auth_user");
          } catch {}
        }
      })
      .catch(() => {
        // Keep credentials available for a retry after a transient network failure.
      })
      .finally(() => {
        if (active && version === authVersion.current) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password?: string, rememberMe = true) => {
    authVersion.current++;
    const result = await loginAction(email, password, rememberMe);
    if (result.success && result.user && !result.mustChangePassword) {
      if (result.token) {
        setAuthToken(result.token, rememberMe);
      }
      clearCache();
      setUser(result.user);
      saveUser(result.user, rememberMe);
    }
    setIsLoading(false);
    return result;
  };

  const completePasswordChange = async (
    userId: string,
    newPassword: string,
    confirmPassword: string,
    rememberMe = true
  ) => {
    authVersion.current++;
    const result = await completePasswordChangeAction({
      userId,
      newPassword,
      confirmPassword,
      rememberMe,
    });
    if (result.success && result.user) {
      if (result.token) {
        setAuthToken(result.token, rememberMe);
      }
      clearCache();
      setUser(result.user);
      saveUser(result.user, rememberMe);
    }
    setIsLoading(false);
    return result;
  };

  const logout = async () => {
    authVersion.current++;
    try {
      await logoutAction();
    } catch {}
    setAuthToken(null);
    clearCache();
    setUser(null);
    try {
      localStorage.removeItem("miqat_auth_user");
      sessionStorage.removeItem("miqat_auth_user");
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        completePasswordChange,
        logout,
        updateUser: (updated) => { setUser(updated); saveUser(updated, hasPersistentSession()); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
