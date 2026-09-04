import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/useAuth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Legal Metrology Verification System" },
      { name: "description", content: "Digital verification workflow for weights and measures: instrument registration, risk-based prioritization, field inspection and certification." },
      { property: "og:title", content: "Legal Metrology Verification System" },
      { property: "og:description", content: "Instrument registration, risk-based prioritization, inspection and certification." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: user ? (`/${user.role.toLowerCase()}` as "/citizen") : "/login", replace: true });
  }, [user, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading Legal Metrology Verification System…
    </div>
  );
}
