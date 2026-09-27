"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { SystemUser } from "./types";
import { loginAction, logoutAction, completePasswordChangeAction, getCurrentSession } from "@/app/_actions/auth";
import { invalidateClientCache as clearCache } from "./clientCache";
import { getAuthToken, setAuthToken } from "./backend";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // 1. Try to restore cached user immediately so UI doesn't flicker
    try {
      const cached =
        localStorage.getItem("miqat_auth_user") ||
        sessionStorage.getItem("miqat_auth_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && active) {
          setUser(parsed);
        }
      }
    } catch {}

    const token = getAuthToken();
    if (!token) {
      if (active) {
        setUser(null);
        setIsLoading(false);
      }
      return;
    }

    // 2. Validate current session with backend using Authorization header
    getCurrentSession()
      .then((session) => {
        if (!active) return;
        if (session && !session.mustChangePassword) {
          setUser(session);
          try {
            localStorage.setItem("miqat_auth_user", JSON.stringify(session));
          } catch {}
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
        // Keep cached user on transient network failure
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password?: string, rememberMe = true) => {
    const result = await loginAction(email, password, rememberMe);
    if (result.success && result.user && !result.mustChangePassword) {
      if (result.token) {
        setAuthToken(result.token);
      }
      clearCache();
      setUser(result.user);
      try {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("miqat_auth_user", JSON.stringify(result.user));
      } catch {}
    }
    return result;
  };

  const completePasswordChange = async (
    userId: string,
    newPassword: string,
    confirmPassword: string,
    rememberMe = true
  ) => {
    const result = await completePasswordChangeAction({
      userId,
      newPassword,
      confirmPassword,
      rememberMe,
    });
    if (result.success && result.user) {
      if (result.token) {
        setAuthToken(result.token);
      }
      clearCache();
      setUser(result.user);
      try {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("miqat_auth_user", JSON.stringify(result.user));
      } catch {}
    }
    return result;
  };

  const logout = async () => {
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
        updateUser: setUser,
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
