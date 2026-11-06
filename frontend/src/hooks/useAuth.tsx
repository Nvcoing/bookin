import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { User } from "../types";

interface AuthValue {
  user: User | null;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const value = localStorage.getItem("bookin_user");
    return value ? JSON.parse(value) : null;
  });
  const value = useMemo(() => ({
    user,
    signIn: (token: string, next: User) => { localStorage.setItem("bookin_token", token); localStorage.setItem("bookin_user", JSON.stringify(next)); setUser(next); },
    signOut: () => { localStorage.removeItem("bookin_token"); localStorage.removeItem("bookin_user"); setUser(null); },
    updateUser: (next: User) => { localStorage.setItem("bookin_user", JSON.stringify(next)); setUser(next); },
  }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}
