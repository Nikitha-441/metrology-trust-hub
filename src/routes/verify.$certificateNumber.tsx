import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CertificateStatusBadge } from "@/components/ui-kit";
import { PublicVerifyShell, VerifyLookup } from "@/components/VerifyLookup";
import { buildCertificateView, buildPublicCertificateView, decodePublicQrPayload } from "@/lib/certificate";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/verify/$certificateNumber")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Certificate Verification Result — Legal Metrology" },
      { name: "description", content: "Public verification result for a Legal Metrology certificate: instrument, serial number, verification result, issue date and validity status." },
      { property: "og:title", content: "Certificate Verification Result — Legal Metrology" },
      { property: "og:description", content: "Check the validity status of a Legal Metrology verification certificate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyResult,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function VerifyResult() {
  const { certificateNumber } = useParams({ from: "/verify/$certificateNumber" });
  const state = useAppState();
  const view = useMemo(() => {
    const local = buildCertificateView(certificateNumber, state);
    if (local) return local;
    const payload = decodePublicQrPayload(
      typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("p"),
    );
    return payload ? buildPublicCertificateView(certificateNumber, payload) : null;
  }, [certificateNumber, state]);

  return (
    <PublicVerifyShell>
      {!view ? (
        <Card className="border-2 border-destructive">
          <p className="text-lg font-bold text-destructive">✕ CERTIFICATE NOT FOUND</p>
          <p className="mt-1 text-sm text-muted-foreground">Unable to verify this certificate.</p>
        </Card>
      ) : view.status === "EXPIRED" || view.status === "REVOKED" ? (
        <Card className="border-2 border-destructive">
          <p className="text-lg font-bold text-destructive">
            {view.status === "REVOKED" ? "✕ CERTIFICATE REVOKED" : "✕ CERTIFICATE EXPIRED"}
          </p>
          <div className="mt-3">
            <Row label="Certificate Number" value={view.certificate.certificateNumber} />
            <Row label="Owner" value={view.owner?.name ?? "—"} />
            <Row label="Instrument" value={view.instrument?.type ?? "—"} />
            <Row label="Serial Number" value={view.instrument?.serialNumber ?? "—"} />
            <Row label="Issued" value={view.certificate.issueDate} />
            <Row label="Expired On" value={view.certificate.validUntil} />
            <Row label="Status" value={<CertificateStatusBadge status={view.status} />} />
          </div>
          <p className="mt-4 text-sm font-semibold text-destructive">
            This certificate is no longer valid. Re-verification is required.
          </p>
        </Card>
      ) : (
        <Card className="border-2 border-foreground">
          <p className="text-lg font-bold">✓ CERTIFICATE VERIFIED</p>
          <div className="mt-3">
            <Row label="Certificate Number" value={view.certificate.certificateNumber} />
            <Row label="Owner" value={view.owner?.name ?? "—"} />
            <Row label="Instrument" value={view.instrument?.type ?? "—"} />
            <Row label="Serial Number" value={view.instrument?.serialNumber ?? "—"} />
            <Row
              label="Verification Result"
              value={view.inspection?.result === "FAIL" ? "FAILED" : "PASSED"}
            />
            <Row label="Issued" value={view.certificate.issueDate} />
            <Row label="Valid Until" value={view.certificate.validUntil} />
            <Row label="Status" value={<CertificateStatusBadge status={view.status} />} />
          </div>
          <p className="mt-4 text-sm font-semibold">
            This certificate is currently valid.
            {view.status === "EXPIRING SOON" &&
              ` It expires on ${view.certificate.validUntil} — re-verification is due soon.`}
          </p>
        </Card>
      )}

      <Card>
        <p className="text-sm font-semibold">Verify another certificate</p>
        <div className="mt-3">
          <VerifyLookup initial={certificateNumber} />
        </div>
      </Card>
    </PublicVerifyShell>
  );
}
