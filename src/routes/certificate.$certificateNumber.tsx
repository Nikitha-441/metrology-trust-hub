import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Button, Card } from "@/components/ui-kit";
import { CertificateDocument } from "@/components/CertificateDocument";
import { buildCertificateView } from "@/lib/certificate";
import { useAppState } from "@/lib/store";
import { useSession } from "@/lib/useAuth";

export const Route = createFileRoute("/certificate/$certificateNumber")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verification Certificate — Legal Metrology" },
      { name: "description", content: "View and download the formal Legal Metrology verification certificate with QR-based public verification." },
      { property: "og:title", content: "Verification Certificate — Legal Metrology" },
      { property: "og:description", content: "View and download a Legal Metrology verification certificate." },
    ],
  }),
  component: CertificatePage,
});

function CertificatePage() {
  const { certificateNumber } = useParams({ from: "/certificate/$certificateNumber" });
  const state = useAppState();
  const { user } = useSession();
  const view = useMemo(
    () => buildCertificateView(certificateNumber, state),
    [certificateNumber, state],
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("print") !== "1") return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar px-4 py-3 text-sidebar-foreground">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
            Legal Metrology Verification System
          </p>
          <h1 className="text-lg font-bold">Verification Certificate</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to={user ? (`/${user.role.toLowerCase()}` as "/citizen") : "/login"}>
            <Button variant="outline">BACK</Button>
          </Link>
          <Link to="/verify/$certificateNumber" params={{ certificateNumber }}>
            <Button variant="outline">PUBLIC VERIFICATION</Button>
          </Link>
        </div>
        {view ? (
          <CertificateDocument view={view} />
        ) : (
          <Card>
            <p className="font-bold">Certificate not found</p>
            <p className="text-sm text-muted-foreground">
              No certificate matches {certificateNumber}.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
