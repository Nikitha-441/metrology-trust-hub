import { useEffect, useState } from "react";
import { Button, CertificateStatusBadge } from "@/components/ui-kit";
import { officerDesignation, type CertificateView } from "@/lib/certificate";
import { downloadCertificatePdf, qrDataUrl } from "@/lib/certificate-pdf";

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value || "—"}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="border-b-2 border-foreground pb-1 text-xs font-bold uppercase tracking-[0.15em]">
        {title}
      </h2>
      <div className="mt-2 grid gap-x-8 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function CertificateDocument({ view }: { view: CertificateView }) {
  const { certificate: cert, status, application, instrument, owner, officer, inspection } = view;
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    qrDataUrl(view.verificationUrl)
      .then((d) => alive && setQr(d))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [view.verificationUrl]);

  const expired = status === "EXPIRED" || status === "REVOKED";

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-2">
        <CertificateStatusBadge status={status} />
        <Button variant="outline" onClick={() => window.print()}>
          PRINT
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadCertificatePdf(view);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "PREPARING…" : "DOWNLOAD CERTIFICATE"}
        </Button>
      </div>

      <article className="rounded-lg border-4 border-double border-foreground bg-card p-6 sm:p-10">
        <header className="border-b-2 border-foreground pb-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Government of India · Department of
          </p>
          <h1 className="mt-1 text-xl font-bold uppercase tracking-[0.12em]">
            Legal Metrology Department
          </h1>
          <p className="mt-2 text-base font-bold uppercase tracking-[0.3em]">
            Verification Certificate
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            Prototype document — not an official government-issued certificate
          </p>
        </header>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="text-sm">
            <p>
              <span className="text-muted-foreground">Certificate No: </span>
              <span className="font-bold">{cert.certificateNumber}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Application ID: </span>
              <span className="font-bold">{application?.id ?? "—"}</span>
            </p>
          </div>
          {qr && (
            <div className="text-center">
              <img src={qr} alt={`QR code linking to public verification of certificate ${cert.certificateNumber}`} className="h-24 w-24" />
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Scan to verify
              </p>
            </div>
          )}
        </div>

        <Block title="Owner / Applicant Details">
          <Row label="Name" value={owner?.name} />
          <Row label="Email" value={owner?.email} />
          <Row label="Organization" value={owner?.organization} />
          <Row label="Address" value={owner?.address ?? instrument?.location} />
        </Block>

        <Block title="Instrument Details">
          <Row label="Instrument Type" value={instrument?.type} />
          <Row label="Make" value={instrument?.make} />
          <Row label="Model" value={instrument?.model} />
          <Row label="Serial Number" value={instrument?.serialNumber} />
          <Row label="Capacity" value={instrument?.capacity} />
          <Row label="Unit" value={instrument?.unit} />
          <Row label="Location" value={instrument?.location} />
        </Block>

        <Block title="Verification Details">
          <Row label="Verification Type" value={application?.verificationType} />
          <Row label="Inspection Date" value={inspection?.inspectedAt?.slice(0, 10)} />
          <Row label="Officer Name" value={officer?.name} />
          <Row label="Officer Designation" value={officerDesignation(officer)} />
          <Row label="Result" value={inspection?.result === "FAIL" ? "FAILED" : "PASSED"} />
        </Block>

        <Block title="Validity">
          <Row label="Date of Issue" value={cert.issueDate} />
          <Row label="Validity Period" value={cert.validityMonths ? `${cert.validityMonths} months` : undefined} />
        </Block>

        <div
          className={`mt-6 rounded-md border-2 p-4 text-center ${
            expired ? "border-destructive bg-destructive/10" : "border-foreground bg-muted"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Valid Until
          </p>
          <p className="text-3xl font-bold tracking-wide">{cert.validUntil}</p>
          {status === "EXPIRED" || status === "REVOKED" ? (
            <div className="mt-2">
              <p className="text-sm font-bold uppercase tracking-wide text-destructive">
                {status === "REVOKED" ? "This certificate has been revoked" : "This certificate has expired"}
              </p>
              <p className="text-sm text-destructive">Verification / re-verification is required.</p>
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold">
              This certificate is valid until {cert.validUntil}.
              {status === "EXPIRING SOON" && " Expiring soon — plan re-verification."}
            </p>
          )}
        </div>

        <footer className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <p className="max-w-xs text-[10px] text-muted-foreground">
            Verify online at {view.verificationUrl}
          </p>
          <div className="min-w-[200px] border-t border-foreground pt-1 text-right">
            <p className="text-sm font-bold">{officer?.name ?? "Verifying Officer"}</p>
            <p className="text-xs text-muted-foreground">{officerDesignation(officer)}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Signature / Designation
            </p>
          </div>
        </footer>
      </article>
    </div>
  );
}
