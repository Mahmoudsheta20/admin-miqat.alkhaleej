"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserRole, SystemUser } from "./types";
import { loginAction, quickLoginAction, logoutAction } from "@/app/_actions/auth";

interface AuthContextType {
  user: SystemUser | null;
  isLoading: boolean;
  login: (email: string, role?: UserRole, rememberMe?: boolean) => Promise<boolean>;
  quickLogin: (role: UserRole, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: SystemUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem("miqat_auth_user") ||
        sessionStorage.getItem("miqat_auth_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (userData: SystemUser, rememberMe: boolean = true) => {
    const serialized = JSON.stringify(userData);
    if (rememberMe) {
      localStorage.setItem("miqat_auth_user", serialized);
      sessionStorage.removeItem("miqat_auth_user");
    } else {
      sessionStorage.setItem("miqat_auth_user", serialized);
      localStorage.removeItem("miqat_auth_user");
    }
    // Also ensure cookie exists for middleware
    const sessionCookie = encodeURIComponent(
      JSON.stringify({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        nationalId: userData.nationalId,
        assignedVehiclePlate: userData.assignedVehiclePlate,
        avatarUrl: userData.avatarUrl,
      })
    );
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    document.cookie = `miqat_session=${sessionCookie}; path=/; max-age=${maxAge}; SameSite=Lax`;
  };

  const updateUser = (userData: SystemUser) => {
    setUser(userData);
    saveUserSession(userData, true);
  };

  const login = async (
    email: string,
    explicitRole?: UserRole,
    rememberMe: boolean = true
  ): Promise<boolean> => {
    const res = await loginAction(email, rememberMe);
    if (res.success && res.user) {
      setUser(res.user);
      saveUserSession(res.user, rememberMe);
      return true;
    }
    if (explicitRole) {
      const qRes = await quickLoginAction(explicitRole, rememberMe);
      if (qRes.success && qRes.user) {
        setUser(qRes.user);
        saveUserSession(qRes.user, rememberMe);
        return true;
      }
    }
    return false;
  };

  const quickLogin = async (
    role: UserRole,
    rememberMe: boolean = true
  ): Promise<boolean> => {
    const res = await quickLoginAction(role, rememberMe);
    if (res.success && res.user) {
      setUser(res.user);
      saveUserSession(res.user, rememberMe);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await logoutAction();
    setUser(null);
    localStorage.removeItem("miqat_auth_user");
    sessionStorage.removeItem("miqat_auth_user");
    document.cookie = "miqat_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, quickLogin, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
