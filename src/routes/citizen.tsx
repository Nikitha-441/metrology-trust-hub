import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { RecordSearch } from "@/components/RecordSearch";

import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  Field,
  Modal,
  RiskBadge,
  SectionTitle,
  StatCard,
  StatusBadge,
  StatusTimeline,
  NextAction,
  inputClass,
} from "@/components/ui-kit";
import {
  addInstrument,
  certificateStatus,
  createApplication,
  daysUntil,
  requestReinspection,
  useAppState,
} from "@/lib/store";
import { ProfileSection } from "@/components/ProfileSection";
import { CertificateStatusBadge, FilePreview, FileUpload, ScheduleCard } from "@/components/ui-kit";
import type { UploadedFile } from "@/lib/types";
import { useRequireRole } from "@/lib/useAuth";
import type { Application, Instrument } from "@/lib/types";
import { computeRisk } from "@/lib/risk";

export const Route = createFileRoute("/citizen")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Citizen Portal — Legal Metrology Verification" },
      { name: "description", content: "Register weighing and measuring instruments, submit verification applications and track certificate status." },
      { property: "og:title", content: "Citizen Portal — Legal Metrology Verification" },
      { property: "og:description", content: "Register instruments, apply for verification and track status." },
    ],
  }),
  component: CitizenPage,
});

const TABS = ["Dashboard", "Instruments", "Applications", "Certificates", "Profile"];

function CitizenPage() {
  const user = useRequireRole("CITIZEN");
  const state = useAppState();
  const [tab, setTab] = useState("Dashboard");
  const [showInstrument, setShowInstrument] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [prefill, setPrefill] = useState<{ instrumentId: string; type: Application["verificationType"] } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [historyInstrumentId, setHistoryInstrumentId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const instruments = useMemo(
    () => state.instruments.filter((i) => i.ownerId === user?.id),
    [state.instruments, user],
  );
  const applications = useMemo(
    () =>
      state.applications
        .filter((a) => a.applicantId === user?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.applications, user],
  );
  const certificates = state.certificates.filter((c) =>
    applications.some((a) => a.id === c.applicationId),
  );
  // Only the latest certificate for each instrument can trigger a current
  // verification-required/expiry alert. Historical certificates stay visible
  // in the Certificates tab, but must not keep the dashboard warning alive
  // after a successful re-verification.
  const alerts = (() => {
    const latestByInstrument = new Map<string, (typeof certificates)[number]>();
    for (const cert of certificates) {
      const app = state.applications.find((a) => a.id === cert.applicationId);
      if (!app) continue;
      const previous = latestByInstrument.get(app.instrumentId);
      if (
        !previous ||
        cert.issueDate > previous.issueDate ||
        (cert.issueDate === previous.issueDate && cert.validUntil > previous.validUntil)
      ) {
        latestByInstrument.set(app.instrumentId, cert);
      }
    }

    return Array.from(latestByInstrument.values())
      .map((c) => {
        const status = certificateStatus(c);
        const app = state.applications.find((a) => a.id === c.applicationId);
        const inst = state.instruments.find((i) => i.id === app?.instrumentId);
        return { cert: c, status, instrument: inst };
      })
      .filter((a) => a.status === "EXPIRED" || a.status === "EXPIRING SOON");
  })();
  const expiring = alerts.filter((a) => a.status === "EXPIRING SOON").length;

  const openReverify = (instrumentId: string) => {
    setPrefill({ instrumentId, type: "RE-VERIFICATION" });
    setShowApplication(true);
  };

  if (!user) return null;

  const active = applications.filter((a) => !["CERTIFIED", "FAILED"].includes(a.status));

  return (
    <AppShell user={user} title="Citizen Portal" tabs={TABS} active={tab} onTab={setTab}>
      {toast && (
        <div className="mb-4 rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          {toast}
        </div>
      )}

      {tab === "Dashboard" && (
        <div className="space-y-6">
          <ExpiryAlerts alerts={alerts} onReverify={openReverify} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="My Instruments" value={instruments.length} />
            <StatCard label="Active Applications" value={active.length} />
            <StatCard label="Verified Certificates" value={certificates.length} />
            <StatCard label="Expiring Certificates" value={expiring} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowInstrument(true)}>+ REGISTER INSTRUMENT</Button>
            <Button
              variant="outline"
              onClick={() => {
                setPrefill(null);
                setShowApplication(true);
              }}
            >
              + NEW VERIFICATION APPLICATION
            </Button>
          </div>
          <div>
            <SectionTitle>My Instruments</SectionTitle>
            <InstrumentGrid instruments={instruments} onHistory={setHistoryInstrumentId} />
          </div>
          <div>
            <SectionTitle>Recent Applications</SectionTitle>
            <ApplicationList applications={applications.slice(0, 3)} state={state} onOpen={setDetailId} />
          </div>
        </div>
      )}

      {tab === "Instruments" && (
        <div>
          <SectionTitle
            action={<Button onClick={() => setShowInstrument(true)}>+ REGISTER INSTRUMENT</Button>}
          >
            My Instruments
          </SectionTitle>
          <InstrumentGrid instruments={instruments} onHistory={setHistoryInstrumentId} />
        </div>
      )}

      {tab === "Applications" && (
        <div className="space-y-6">
          <ExpiryAlerts alerts={alerts} onReverify={openReverify} />
          <RecordSearch
            state={state}
            applications={applications}
            onOpen={setDetailId}
            label="SEARCH MY APPLICATIONS"
            placeholder="Application ID, e.g. LM-APP-1007"
            withApplicant={false}
          />
          <SectionTitle
            action={
              <Button
                onClick={() => {
                  setPrefill(null);
                  setShowApplication(true);
                }}
              >
                + NEW VERIFICATION APPLICATION
              </Button>
            }
          >
            My Applications
          </SectionTitle>
          <ApplicationList applications={applications} state={state} onOpen={setDetailId} />
        </div>
      )}


      {tab === "Certificates" && (
        <div className="space-y-6">
          <ExpiryAlerts alerts={alerts} onReverify={openReverify} />
          <SectionTitle>Certificates</SectionTitle>
          {certificates.length === 0 && <Empty text="No certificates issued yet." />}
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map((c) => {
              const app = state.applications.find((a) => a.id === c.applicationId);
              const inst = state.instruments.find((i) => i.id === app?.instrumentId);
              const status = certificateStatus(c);
              return (
                <Card key={c.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{c.certificateNumber}</span>
                    <CertificateStatusBadge status={status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {inst?.type} · {inst?.serialNumber}
                  </p>
                  <p className="mt-1 text-sm">
                    {status === "EXPIRED"
                      ? `Expired on: ${c.validUntil}`
                      : `Valid until: ${c.validUntil}`}
                    {" · "}Issued {c.issueDate}
                    {c.validityMonths ? ` · ${c.validityMonths} month validity` : ""}
                  </p>
                  {(status === "EXPIRED" || status === "EXPIRING SOON") && (
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-destructive">
                      Verification Required
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to="/certificate/$certificateNumber"
                      params={{ certificateNumber: c.certificateNumber }}
                    >
                      <Button variant="outline">VIEW CERTIFICATE</Button>
                    </Link>
                    <DownloadPdfButton certificateNumber={c.certificateNumber} state={state} />
                    {(status === "EXPIRED" || status === "EXPIRING SOON") && inst && (
                      <Button onClick={() => openReverify(inst.id)}>RE-VERIFY</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "Profile" && <ProfileSection user={user} />}

      {historyInstrumentId && (
        <InstrumentHistoryModal instrumentId={historyInstrumentId} onClose={() => setHistoryInstrumentId(null)} />
      )}

      {showInstrument && (
        <RegisterInstrumentModal
          onClose={() => setShowInstrument(false)}
          onSave={(data) => {
            addInstrument(data, user.id);
            setShowInstrument(false);
            setToast("Instrument registered successfully.");
          }}
        />
      )}

      {showApplication && (
        <NewApplicationModal
          instruments={instruments}
          initialInstrumentId={prefill?.instrumentId}
          initialType={prefill?.type}
          onClose={() => {
            setShowApplication(false);
            setPrefill(null);
          }}
          onSubmit={(instrumentId, type, docs) => {
            const app = createApplication(instrumentId, user.id, type, docs);
            setShowApplication(false);
            setPrefill(null);
            setTab("Applications");
            setToast(
              `Application ${app.id} submitted. Risk-based prioritization: ${app.riskScore}/100 — ${app.riskLevel} RISK.`,
            );
          }}
        />
      )}

      {detailId && (
        <ApplicationDetailModal applicationId={detailId} applicantId={user.id} onClose={() => setDetailId(null)} />
      )}
    </AppShell>
  );
}

type Alert = {
  cert: import("@/lib/types").Certificate;
  status: import("@/lib/types").CertificateStatus;
  instrument: Instrument | undefined;
};

function ExpiryAlerts({
  alerts,
  onReverify,
}: {
  alerts: Alert[];
  onReverify: (instrumentId: string) => void;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-3">
      {alerts.map(({ cert, status, instrument }) => {
        const expired = status === "EXPIRED";
        const days = daysUntil(cert.validUntil);
        return (
          <div
            key={cert.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm ${
              expired
                ? "border-destructive/40 bg-destructive/10"
                : "border-warning/50 bg-warning/15"
            }`}
          >
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wide ${
                  expired ? "text-destructive" : "text-warning-foreground"
                }`}
              >
                Verification Required
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {instrument?.type} · {instrument?.serialNumber}
              </p>
              <p className="text-muted-foreground">
                Certificate {cert.certificateNumber}{" "}
                {expired
                  ? `expired on ${cert.validUntil}`
                  : `expires on ${cert.validUntil} (${days} days left)`}
                .
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CertificateStatusBadge status={status} />
              {instrument && <Button onClick={() => onReverify(instrument.id)}>RE-VERIFY</Button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicationDetailModal({
  applicationId,
  applicantId,
  onClose,
}: {
  applicationId: string;
  applicantId: string;
  onClose: () => void;
}) {
  const state = useAppState();
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app) return null;
  const inst = state.instruments.find((i) => i.id === app.instrumentId);
  const officer = state.users.find((u) => u.id === app.assignedOfficerId);
  const insp = state.inspections.find((i) => i.applicationId === app.id);
  const cert = state.certificates.find((c) => c.applicationId === app.id);

  const history: { at: string; label: string }[] = [
    { at: app.createdAt, label: `Application ${app.id} submitted (${app.verificationType})` },
    {
      at: app.createdAt,
      label: `Risk-based prioritization: ${app.riskScore}/100 — ${app.riskLevel}`,
    },
  ];
  if (officer) history.push({ at: app.createdAt, label: `Officer assigned: ${officer.name}` });
  if (app.schedule?.date)
    history.push({
      at: `${app.schedule.date}T${app.schedule.time || "00:00"}`,
      label: `Inspection scheduled at ${app.schedule.location}`,
    });
  if (app.status === "INSPECTION" && !insp)
    history.push({ at: new Date().toISOString(), label: "Inspection in progress" });
  if (insp)
    history.push({ at: insp.inspectedAt, label: `Inspection completed — ${insp.result}` });
  if (cert)
    history.push({
      at: `${cert.issueDate}T00:00:00`,
      label: `Certificate ${cert.certificateNumber} issued, valid until ${cert.validUntil}`,
    });
  history.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Modal title={`Application ${app.id}`} onClose={onClose}>
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold">{app.id}</p>
              <p className="text-sm text-muted-foreground">
                {inst?.type} · {inst?.serialNumber} · {app.verificationType}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level={app.riskLevel} score={app.riskScore} />
              <StatusBadge status={app.status} />
            </div>
          </div>
          <div className="mt-4">
            <StatusTimeline status={app.status} />
          </div>
        </Card>

        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Risk Factors
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {app.riskReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Officer</p>
          <p className="mt-1 text-sm">
            {officer ? `${officer.name} (${officer.officerType})` : "Not assigned yet"}
          </p>
        </Card>

        {app.schedule && <ScheduleCard schedule={app.schedule} officerName={officer?.name} />}

        {(app.instrumentPhoto || app.supportingDocument || insp?.inspectionPhoto || insp?.evidencePhoto) && (
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Evidence &amp; Documents
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {app.instrumentPhoto && <FilePreview file={app.instrumentPhoto} compact />}
              {app.supportingDocument && <FilePreview file={app.supportingDocument} compact />}
              {insp?.inspectionPhoto && <FilePreview file={insp.inspectionPhoto} compact />}
              {insp?.evidencePhoto && <FilePreview file={insp.evidencePhoto} compact />}
            </div>
          </Card>
        )}

        {insp && (
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Inspection
            </p>
            <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <div>Result: <span className="font-semibold">{insp.result}</span></div>
              <div>Zero error: <span className="font-medium">{insp.zeroError}</span></div>
              <div>Reading 1: <span className="font-medium">{insp.standardReading1}</span></div>
              <div>Reading 2: <span className="font-medium">{insp.standardReading2}</span></div>
              {insp.displayCondition && <div>Display: <span className="font-medium">{insp.displayCondition}</span></div>}
              {insp.sealCondition && <div>Seal: <span className="font-medium">{insp.sealCondition}</span></div>}
              <div className="sm:col-span-2">Remarks: <span className="font-medium">{insp.remarks || "—"}</span></div>
            </dl>
          </Card>
        )}

        {app.status === "CORRECTION_REQUIRED" && (
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-destructive">Correction Required</p>
            <p className="mt-2 text-sm font-semibold">Inspection failed. Correct the issue and request reinspection.</p>
            {app.failureReasons && app.failureReasons.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {app.failureReasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
            {app.correctiveAction && <p className="mt-2 text-sm"><span className="font-semibold">Required action:</span> {app.correctiveAction}</p>}
            {app.officerRemarks && <p className="mt-2 text-sm"><span className="font-semibold">Officer remarks:</span> {app.officerRemarks}</p>}
            <Button className="mt-3" onClick={() => { const next = requestReinspection(app.id, applicantId); if (next) { setDetailId(null); } }}>REQUEST REINSPECTION</Button>
          </Card>
        )}

        {cert && (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Certificate
              </p>
              <CertificateStatusBadge status={certificateStatus(cert)} />
            </div>
            <p className="mt-1 font-semibold">{cert.certificateNumber}</p>
            <p className="text-sm text-muted-foreground">
              Issued {cert.issueDate} · Valid until {cert.validUntil}
              {cert.validityMonths ? ` · ${cert.validityMonths} month validity` : ""}
            </p>
          </Card>
        )}

        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Activity History
          </p>
          <ol className="mt-2 space-y-2 text-sm">
            {history.map((h, idx) => (
              <li key={`${h.at}-${idx}`} className="flex gap-3">
                <span className="whitespace-nowrap text-muted-foreground">
                  {new Date(h.at).toLocaleString("en-GB")}
                </span>
                <span className="text-foreground">{h.label}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </Modal>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function InstrumentGrid({ instruments, onHistory }: { instruments: Instrument[]; onHistory: (instrumentId: string) => void }) {
  if (instruments.length === 0) return <Empty text="No instruments registered yet." />;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {instruments.map((i) => (
        <Card key={i.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-foreground">{i.type}</h3>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">Risk assessment</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                  i.verificationStatus === "VERIFIED"
                    ? "bg-success/15 text-success"
                    : i.verificationStatus === "REJECTED"
                      ? "bg-destructive/15 text-destructive"
                      : i.verificationStatus === "PENDING"
                        ? "bg-warning/25 text-warning-foreground"
                        : "bg-secondary text-secondary-foreground"
                }`}
              >
                {i.verificationStatus}
              </span>
              <RiskBadge level={computeRisk(i).riskLevel} score={computeRisk(i).riskScore} />
            </div>
          </div>
          <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div>Make / Model: <span className="text-foreground">{i.make} {i.model}</span></div>
            <div>Serial No: <span className="text-foreground">{i.serialNumber}</span></div>
            <div>Capacity: <span className="text-foreground">{i.capacity} {i.unit}</span></div>
            <div>Location: <span className="text-foreground">{i.location}</span></div>
            {i.validUntil && <div>Valid until: <span className="text-foreground">{i.validUntil}</span></div>}
          </dl>
          <Button className="mt-4 w-full" variant="outline" onClick={() => onHistory(i.id)}>VERIFICATION HISTORY</Button>
        </Card>
      ))}
    </div>
  );
}

function InstrumentHistoryModal({
  instrumentId,
  onClose,
}: {
  instrumentId: string;
  onClose: () => void;
}) {
  const state = useAppState();
  const instrument = state.instruments.find((i) => i.id === instrumentId);
  const applications = state.applications.filter((a) => a.instrumentId === instrumentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const inspections = state.inspections.filter((i) => applications.some((a) => a.id === i.applicationId)).sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt));
  const certificates = state.certificates.filter((c) => applications.some((a) => a.id === c.applicationId)).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  if (!instrument) return null;
  return (
    <Modal title={`Verification History · ${instrument.type}`} onClose={onClose}>
      <div className="space-y-4">
        <Card>
          <p className="text-lg font-bold">{instrument.make} {instrument.model}</p>
          <p className="text-sm text-muted-foreground">Serial: {instrument.serialNumber} · {instrument.capacity} {instrument.unit}</p>
          <p className="mt-2 text-sm"><span className="font-semibold">Current status:</span> {instrument.verificationStatus}{instrument.validUntil ? ` · valid until ${instrument.validUntil}` : ""}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Verification History</p>
          <div className="mt-3 space-y-3">
            {certificates.map((cert) => {
              const app = applications.find((a) => a.id === cert.applicationId);
              const officer = state.users.find((u) => u.id === app?.assignedOfficerId);
              return (
                <div key={cert.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{cert.issueDate.slice(0, 4)} · {cert.certificateNumber}</p>
                    <CertificateStatusBadge status={certificateStatus(cert)} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Officer: {officer?.name ?? "—"} · Valid until: {cert.validUntil}</p>
                </div>
              );
            })}
            {inspections.map((insp) => {
              if (insp.result !== "FAIL") return null;
              const app = applications.find((a) => a.id === insp.applicationId);
              return (
                <div key={`${insp.applicationId}-${insp.inspectedAt}`} className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{new Date(insp.inspectedAt).getFullYear()} · Failed inspection</p>
                    <span className="text-xs font-bold text-destructive">✗ FAILED</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Application: {app?.id}</p>
                  <p className="mt-1 text-sm">Reason: {insp.failureReasons?.join(", ") || insp.remarks}</p>
                </div>
              );
            })}
            {certificates.length === 0 && inspections.filter((i) => i.result === "FAIL").length === 0 && <Empty text="No verification history yet." />}
          </div>
        </Card>
      </div>
    </Modal>
  );
}

function ApplicationList({
  applications,
  state,
  onOpen,
}: {
  applications: Application[];
  state: ReturnType<typeof useAppState>;
  onOpen?: (id: string) => void;
}) {
  if (applications.length === 0) return <Empty text="No applications yet." />;
  return (
    <div className="space-y-4">
      {applications.map((a) => {
        const inst = state.instruments.find((i) => i.id === a.instrumentId);
        const officer = state.users.find((u) => u.id === a.assignedOfficerId);
        const insp = state.inspections.find((i) => i.applicationId === a.id);
        return (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">{a.id}</p>
                <p className="text-sm text-muted-foreground">
                  {inst?.type} · {inst?.serialNumber} · {a.verificationType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RiskBadge level={a.riskLevel} score={a.riskScore} />
                <StatusBadge status={a.status} />
              </div>
            </div>
            <div className="mt-4">
              <StatusTimeline status={a.status} />
              <NextAction
                status={a.status}
                cert={state.certificates.find((c) => c.applicationId === a.id)}
                certStatus={(() => {
                  const cert = state.certificates.find((c) => c.applicationId === a.id);
                  return cert ? certificateStatus(cert) : undefined;
                })()}
              />
            </div>
            {a.schedule && (
              <div className="mt-3">
                <ScheduleCard schedule={a.schedule} officerName={officer?.name} />
              </div>
            )}
            {(a.instrumentPhoto || a.supportingDocument) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {a.instrumentPhoto && <FilePreview file={a.instrumentPhoto} compact />}
                {a.supportingDocument && <FilePreview file={a.supportingDocument} compact />}
              </div>
            )}
            <div className="mt-3 text-sm text-muted-foreground">
              <p>Risk reasons: {a.riskReasons.join(", ")}</p>
              {officer && <p>Assigned officer: {officer.name} ({officer.officerType})</p>}
              {insp && <p>Inspection: {insp.result} — {insp.remarks}</p>}
              {a.status === "CORRECTION_REQUIRED" && <p className="mt-1 font-semibold text-destructive">Correction required: {a.failureReasons?.join(", ") || "Inspection failed"}</p>}
            </div>
            {onOpen && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onOpen(a.id)}>VIEW DETAILS</Button>
                {a.status === "CORRECTION_REQUIRED" && (
                  <Button onClick={() => { const next = requestReinspection(a.id, a.applicantId); if (next) onOpen(next.id); }}>REQUEST REINSPECTION</Button>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

const TYPES = [
  "Electronic Weighing Scale",
  "Counter Scale",
  "Beam Scale",
  "Weighbridge",
  "Fuel Dispenser",
  "Petrol Pump Flow Meter",
  "Bulk Flow Meter",
  "Measuring Tape",
];

function RegisterInstrumentModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: Omit<Instrument, "id" | "ownerId" | "verificationStatus" | "validUntil">) => void;
}) {
  const [form, setForm] = useState({
    type: "Electronic Weighing Scale",
    make: "",
    model: "",
    serialNumber: "",
    capacity: "",
    unit: "kg",
    location: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.make && form.model && form.serialNumber && form.capacity && form.location;

  return (
    <Modal title="Register Instrument" onClose={onClose}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(form);
        }}
      >
        <Field label="Instrument Type">
          <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Make">
          <input className={inputClass} value={form.make} onChange={(e) => set("make", e.target.value)} />
        </Field>
        <Field label="Model">
          <input className={inputClass} value={form.model} onChange={(e) => set("model", e.target.value)} />
        </Field>
        <Field label="Serial Number">
          <input className={inputClass} value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} />
        </Field>
        <Field label="Capacity">
          <input className={inputClass} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
        </Field>
        <Field label="Unit">
          <select className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value)}>
            {["kg", "g", "tonne", "L", "L/min", "m"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Location">
            <input className={inputClass} value={form.location} onChange={(e) => set("location", e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            Save Instrument
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NewApplicationModal({
  instruments,
  initialInstrumentId,
  initialType,
  onClose,
  onSubmit,
}: {
  instruments: Instrument[];
  initialInstrumentId?: string | undefined;
  initialType?: Application["verificationType"] | undefined;
  onClose: () => void;
  onSubmit: (
    instrumentId: string,
    type: Application["verificationType"],
    docs: { instrumentPhoto: UploadedFile | null; supportingDocument: UploadedFile | null },
  ) => void;
}) {
  const [instrumentId, setInstrumentId] = useState(
    initialInstrumentId ?? instruments[0]?.id ?? "",
  );
  const [type, setType] = useState<Application["verificationType"]>(
    initialType ?? "INITIAL VERIFICATION",
  );
  const [instrumentPhoto, setInstrumentPhoto] = useState<UploadedFile | null>(null);
  const [supportingDocument, setSupportingDocument] = useState<UploadedFile | null>(null);
  const selected = instruments.find((i) => i.id === instrumentId);

  return (
    <Modal title="New Verification Application" onClose={onClose}>
      {instruments.length === 0 ? (
        <Empty text="Register an instrument first." />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(instrumentId, type, { instrumentPhoto, supportingDocument });
          }}
        >
          <Field label="Select Instrument">
            <select className={inputClass} value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.type} — {i.serialNumber} ({i.location})
                </option>
              ))}
            </select>
          </Field>
          {selected && (
            <Card>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Instrument Details
              </p>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <div>Type: <span className="font-medium">{selected.type}</span></div>
                <div>Make/Model: <span className="font-medium">{selected.make} {selected.model}</span></div>
                <div>Serial: <span className="font-medium">{selected.serialNumber}</span></div>
                <div>Capacity: <span className="font-medium">{selected.capacity} {selected.unit}</span></div>
                <div className="sm:col-span-2">Location: <span className="font-medium">{selected.location}</span></div>
              </dl>
            </Card>
          )}
          <Field label="Verification Type">
            <select
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value as Application["verificationType"])}
            >
              <option>INITIAL VERIFICATION</option>
              <option>RE-VERIFICATION</option>
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <FileUpload
              label="Instrument Photograph"
              accept="image/*"
              value={instrumentPhoto}
              onChange={setInstrumentPhoto}
            />
            <FileUpload
              label="Supporting Document"
              value={supportingDocument}
              onChange={setSupportingDocument}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit Application</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
