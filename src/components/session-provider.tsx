"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "@/lib/feature-flags";

export interface SessionPayment {
  id: string;
  plan: Role;
  amount: number;
  status: "paid" | "declined";
  cardLast4: string;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  plan: Role;
  createdAt: string;
  payments: SessionPayment[];
}

export interface SessionLimits {
  generationsPerDay: number;
  activeProjects: number | null;
  boards: number | null;
}

interface SessionState {
  user: SessionUser | null;
  role: Role;
  limits: SessionLimits;
  remainingGenerations: number | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
}

const DEFAULT_LIMITS: SessionLimits = {
  generationsPerDay: 3,
  activeProjects: 3,
  boards: 3,
};

const SessionContext = createContext<SessionState>({
  user: null,
  role: "basic",
  limits: DEFAULT_LIMITS,
  remainingGenerations: null,
  loading: true,
  refresh: async () => {},
  setUser: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<Role>("basic");
  const [limits, setLimits] = useState<SessionLimits>(DEFAULT_LIMITS);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
      setRole(data.role ?? "basic");
      if (data.limits) setLimits(data.limits);
      setRemainingGenerations(
        typeof data.remainingGenerations === "number" ? data.remainingGenerations : null
      );
    } catch {
      setUser(null);
      setRole("basic");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, role, limits, remainingGenerations, loading, refresh, setUser }),
    [user, role, limits, remainingGenerations, loading, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
