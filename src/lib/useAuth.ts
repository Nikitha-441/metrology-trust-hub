import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppState } from "./store";
import type { Role, User } from "./types";

export function useSession(): { user: User | null; ready: boolean } {
  const state = useAppState();
  const user = state.users.find((u) => u.id === state.currentUserId) ?? null;
  return { user, ready: typeof window !== "undefined" };
}

export function useRequireRole(role: Role): User | null {
  const { user } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (user.role !== role) {
      navigate({ to: `/${user.role.toLowerCase()}` as "/citizen", replace: true });
    }
  }, [user, role, navigate]);
  return user && user.role === role ? user : null;
}
