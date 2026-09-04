import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { logout, refreshDerivedState } from "@/lib/store";
import { NotificationBell } from "@/components/ui-kit";
import type { User } from "@/lib/types";

export function AppShell({
  user,
  title,
  tabs,
  active,
  onTab,
  children,
}: {
  user: User;
  title: string;
  tabs: string[];
  active: string;
  onTab: (t: string) => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setInterval(() => refreshDerivedState(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
              Legal Metrology Verification System
            </p>
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-sidebar-foreground/80">
              {user.name} · {user.role}
              {user.officerType ? ` (${user.officerType})` : ""}
            </span>
            <NotificationBell userId={user.id} />
            <button
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
              className="rounded-md border border-sidebar-border px-3 py-1.5 font-semibold hover:bg-sidebar-accent"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="border-t border-sidebar-border">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => onTab(t)}
                className={`whitespace-nowrap px-3 py-2 text-sm font-semibold ${
                  active === t
                    ? "border-b-2 border-sidebar-primary text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
