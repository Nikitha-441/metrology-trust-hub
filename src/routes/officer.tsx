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
  NextAction,
  inputClass,
} from "@/components/ui-kit";
import { certificateStatus, completeInspection, startInspection, useAppState } from "@/lib/store";
import { ProfileSection } from "@/components/ProfileSection";
import { FilePreview, FileUpload, ScheduleCard } from "@/components/ui-kit";
import type { UploadedFile } from "@/lib/types";
import { evaluateInspection, INSPECTION_CRITERIA } from "@/lib/inspection";
import { useRequireRole } from "@/lib/useAuth";

export const Route = createFileRoute("/officer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Field Inspections — Legal Metrology Verification" },
      { name: "description", content: "Officer workspace for field inspections: review assigned instruments, record readings and pass or fail verification." },
      { property: "og:title", content: "Field Inspections — Legal Metrology Verification" },
      { property: "og:description", content: "Review assigned inspections, record readings and issue results." },
    ],
  }),
  component: OfficerPage,
});

const TABS = ["Dashboard", "Inspections", "History", "Profile"];

function OfficerPage() {
  const user = useRequireRole("OFFICER");
  const state = useAppState();
  const [tab, setTab] = useState("Dashboard");
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  if (!user) return null;

  const mine = state.applications
    .filter((a) => a.assignedOfficerId === user.id)
    .sort((a, b) => b.riskScore - a.riskScore);
  const pending = mine.filter((a) => ["ASSIGNED", "SCHEDULED", "INSPECTION"].includes(a.status));
  const history = mine.filter((a) => ["CERTIFIED", "FAILED", "CORRECTION_REQUIRED"].includes(a.status));
  const list = tab === "History" ? history : pending;

  return (
    <AppShell user={user} title="Field Inspections" tabs={TABS} active={tab} onTab={setTab}>
      {toast && (
        <div className="mb-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
          {toast}
        </div>
      )}

      {tab === "Profile" && <ProfileSection user={user} />}

      {tab === "Dashboard" && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Assigned to me" value={mine.length} />
          <StatCard label="Scheduled today" value={mine.filter((a) => a.schedule?.date === new Date().toISOString().slice(0, 10)).length} />
          <StatCard label="Upcoming" value={mine.filter((a) => { const d = a.schedule?.date; return !!d && d > new Date().toISOString().slice(0, 10) && !["CERTIFIED", "FAILED"].includes(a.status); }).length} />
          <StatCard label="Completed" value={history.length} />
        </div>
      )}

      {tab !== "Profile" && (
      <>
      <RecordSearch
        state={state}
        applications={mine}
        onOpen={(id) => {
          const found = state.applications.find((a) => a.id === id);
          if (found && ["ASSIGNED", "SCHEDULED"].includes(found.status)) startInspection(id);
          setInspectId(id);
        }}
        label="SEARCH MY ASSIGNED RECORDS"
        placeholder="Application ID · serial · certificate number"
      />
      <SectionTitle>{tab === "History" ? "Inspection History" : "Pending Inspections"}</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a) => {
          const inst = state.instruments.find((i) => i.id === a.instrumentId);
          const applicant = state.users.find((u) => u.id === a.applicantId);
          const insp = state.inspections.find((i) => i.applicationId === a.id);
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{inst?.type}</p>
                  <p className="text-sm text-muted-foreground">{inst?.serialNumber}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-2 text-sm">Applicant: {applicant?.name}</p>
              <p className="text-sm text-muted-foreground">{inst?.location}</p>
              <div className="mt-3">
                <RiskBadge level={a.riskLevel} score={a.riskScore} />
              </div>
              <NextAction
                status={a.status}
                cert={state.certificates.find((c) => c.applicationId === a.id)}
                certStatus={(() => {
                  const cert = state.certificates.find((c) => c.applicationId === a.id);
                  return cert ? certificateStatus(cert) : undefined;
                })()}
              />
              {a.schedule && (
                <div className="mt-3">
                  <ScheduleCard schedule={a.schedule} officerName={user.name} />
                </div>
              )}
              {insp ? (
                <>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Result: <span className="font-semibold text-foreground">{insp.result}</span> — {insp.remarks}
                  </p>
                  {(() => {
                    const cert = state.certificates.find((c) => c.applicationId === a.id);
                    return cert ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          to="/certificate/$certificateNumber"
                          params={{ certificateNumber: cert.certificateNumber }}
                        >
                          <Button variant="outline">VIEW CERTIFICATE</Button>
                        </Link>
                        <DownloadPdfButton certificateNumber={cert.certificateNumber} state={state} />
                      </div>
                    ) : null;
                  })()}
                </>
              ) : (
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      startInspection(a.id);
                      setInspectId(a.id);
                    }}
                  >
                    {a.status === "INSPECTION" ? "CONTINUE INSPECTION" : "START INSPECTION"}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {list.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground md:col-span-2">
            Nothing here yet.
          </p>
        )}
      </div>
      </>
      )}

      {inspectId && (
        <InspectionModal
          applicationId={inspectId}
          onClose={() => setInspectId(null)}
          onDone={(msg) => {
            setInspectId(null);
            setToast(msg);
          }}
        />
      )}
    </AppShell>
  );
}

function InspectionModal({
  applicationId,
  onClose,
  onDone,
}: {
  applicationId: string;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const state = useAppState();
  const app = state.applications.find((a) => a.id === applicationId)!;
  const inst = state.instruments.find((i) => i.id === app.instrumentId);
  const [form, setForm] = useState({
    observation: "",
    remarks: "",
    correctiveAction: "",
  });
  const [visualChecks, setVisualChecks] = useState<Record<string, "PASS" | "FAIL" | "">>({
    "Manufacturer marking": "",
    "Capacity marking": "",
    "Serial number": "",
    "Physical integrity": "",
    "Seal / tampering check": "",
  });
  const [repeatability, setRepeatability] = useState(["", "", ""]);
  const [accuracyTests, setAccuracyTests] = useState([
    { testPoint: "5 kg", reading: "" },
    { testPoint: "10 kg", reading: "" },
    { testPoint: "20 kg", reading: "" },
  ]);
  const [eccentricChecks, setEccentricChecks] = useState<Record<string, "PASS" | "FAIL" | "">>({
    Center: "", Left: "", Right: "", Front: "", Back: "",
  });
  const [evidence, setEvidence] = useState<string | null>(null);
  const [inspectionPhoto, setInspectionPhoto] = useState<UploadedFile | null>(null);
  const [evidencePhoto, setEvidencePhoto] = useState<UploadedFile | null>(null);
  const [error, setError] = useState("");
  const set = (k: "observation" | "remarks" | "correctiveAction", v: string) => setForm((f) => ({ ...f, [k]: v }));

  const evaluation = useMemo(
    () => evaluateInspection({ visualChecks, repeatabilityReadings: repeatability, accuracyTests, eccentricLoadingChecks: eccentricChecks }),
    [visualChecks, repeatability, accuracyTests, eccentricChecks],
  );

  function finish() {
    setError("");
    if (!evaluation.overallComplete) {
      setError("Complete every inspection field before submitting.");
      return;
    }
    if (evaluation.result === "FAIL" && (!evaluation.failureReasons.length || !form.remarks.trim() || !form.correctiveAction.trim())) {
      setError("A failed inspection requires failure reasons, officer remarks, and corrective action.");
      return;
    }
    try {
      const cert = completeInspection(applicationId, {
        ...form,
        result: evaluation.result,
        visualChecks,
        repeatabilityReadings: repeatability,
        repeatabilityResult: evaluation.repeatabilityPass ? "PASS" : "FAIL",
        accuracyTests,
        eccentricLoadingChecks: eccentricChecks,
        failureReasons: evaluation.failureReasons,
        evidence: evidence ?? evidencePhoto?.dataUrl ?? null,
        inspectionPhoto,
        evidencePhoto,
        // Legacy fields kept for compatibility with existing certificate/history views.
        zeroError: "",
        standardReading1: "",
        standardReading2: "",
      });
      onDone(
        evaluation.result === "PASS"
          ? `Inspection passed. Certificate ${cert?.certificateNumber} issued for ${inst?.serialNumber}.`
          : `Inspection failed. Application ${app.id} now requires correction before reinspection.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save inspection.");
    }
  }

  return (
    <Modal title={`Inspection · ${app.id}`} onClose={onClose}>
      <div className="space-y-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Instrument Details
          </p>
          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <div>Type: <span className="font-medium">{inst?.type}</span></div>
            <div>Make: <span className="font-medium">{inst?.make}</span></div>
            <div>Model: <span className="font-medium">{inst?.model}</span></div>
            <div>Serial: <span className="font-medium">{inst?.serialNumber}</span></div>
            <div>Capacity: <span className="font-medium">{inst?.capacity} {inst?.unit}</span></div>
            <div>Location: <span className="font-medium">{inst?.location}</span></div>
          </dl>
        </Card>

        {app.schedule && <ScheduleCard schedule={app.schedule} />}

        {(app.instrumentPhoto || app.supportingDocument) && (
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Applicant Documents
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {app.instrumentPhoto && <FilePreview file={app.instrumentPhoto} compact />}
              {app.supportingDocument && <FilePreview file={app.supportingDocument} compact />}
            </div>
          </Card>
        )}

        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Risk-Based Prioritization
          </p>
          <p className="mt-1 text-2xl font-bold">{app.riskScore} / 100</p>
          <RiskBadge level={app.riskLevel} />
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {app.riskReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Visual Inspection</p>
            <span className={`text-xs font-bold ${evaluation.visualComplete ? (evaluation.visualPass ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
              {evaluation.visualComplete ? (evaluation.visualPass ? "PASS" : "FAIL") : "INCOMPLETE"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {Object.keys(visualChecks).map((item) => (
              <label key={item} className="grid gap-1 text-sm sm:grid-cols-[1fr_180px] sm:items-center">
                <span>{item}</span>
                <select className={inputClass} value={visualChecks[item]} onChange={(e) => setVisualChecks((v) => ({ ...v, [item]: e.target.value as "PASS" | "FAIL" | "" }))}>
                  <option value="">Select result</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                </select>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Repeatability Test</p>
              <p className="mt-1 text-xs text-muted-foreground">Range must be within the configured demo threshold of {INSPECTION_CRITERIA.repeatabilityMaxRange.toFixed(2)} kg.</p>
            </div>
            <span className={`text-xs font-bold ${evaluation.repeatabilityComplete ? (evaluation.repeatabilityPass ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
              {evaluation.repeatabilityComplete ? (evaluation.repeatabilityPass ? "PASS" : "FAIL") : "INCOMPLETE"}
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {repeatability.map((value, index) => (
              <Field key={index} label={`Reading ${index + 1}`}><input inputMode="decimal" className={inputClass} value={value} onChange={(e) => setRepeatability((r) => r.map((x, i) => i === index ? e.target.value : x))} /></Field>
            ))}
          </div>
          {evaluation.repeatabilityComplete && <p className="mt-2 text-xs text-muted-foreground">Observed range: {evaluation.repeatabilityRange.toFixed(3)} kg</p>}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Accuracy / Linearity</p>
              <p className="mt-1 text-xs text-muted-foreground">Each absolute deviation is compared automatically with ±{INSPECTION_CRITERIA.accuracyMaxAbsDeviation.toFixed(2)} kg.</p>
            </div>
            <span className={`text-xs font-bold ${evaluation.accuracyComplete ? (evaluation.accuracyPass ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
              {evaluation.accuracyComplete ? (evaluation.accuracyPass ? "PASS" : "FAIL") : "INCOMPLETE"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {accuracyTests.map((item, index) => {
              const calc = evaluation.accuracyValues[index];
              return (
                <div key={item.testPoint} className="grid gap-2 sm:grid-cols-[120px_1fr_120px] sm:items-center">
                  <span className="text-sm font-medium">{item.testPoint}</span>
                  <input inputMode="decimal" className={inputClass} placeholder="Observed reading" value={item.reading} onChange={(e) => setAccuracyTests((r) => r.map((x, i) => i === index ? { ...x, reading: e.target.value } : x))} />
                  <span className={`text-xs font-bold ${Number.isFinite(calc?.deviation) ? (Math.abs(calc.deviation) <= INSPECTION_CRITERIA.accuracyMaxAbsDeviation ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
                    {Number.isFinite(calc?.deviation) ? `${calc.deviation >= 0 ? "+" : ""}${calc.deviation.toFixed(3)} kg` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Eccentric Loading</p>
            <span className={`text-xs font-bold ${evaluation.eccentricComplete ? (evaluation.eccentricPass ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
              {evaluation.eccentricComplete ? (evaluation.eccentricPass ? "PASS" : "FAIL") : "INCOMPLETE"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {Object.keys(eccentricChecks).map((item) => (
              <label key={item} className="flex flex-col gap-1 text-sm">
                <span>{item}</span>
                <select className={inputClass} value={eccentricChecks[item]} onChange={(e) => setEccentricChecks((v) => ({ ...v, [item]: e.target.value as "PASS" | "FAIL" | "" }))}>
                  <option value="">Select</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                </select>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Evidence &amp; Remarks</p>
          <div className="mt-3">
            <Field label="Measurement Observation">
              <input className={inputClass} value={form.observation} onChange={(e) => set("observation", e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Officer Remarks">
              <textarea className={`${inputClass} min-h-20`} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder={evaluation.result === "FAIL" ? "Explain the observed issue." : "Optional inspection remarks."} />
            </Field>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <FileUpload label="Inspection Photograph" accept="image/*" value={inspectionPhoto} onChange={setInspectionPhoto} />
            <FileUpload label="Evidence Photograph / PDF" accept="image/*,.pdf" value={evidencePhoto} onChange={(f) => { setEvidencePhoto(f); setEvidence(f?.dataUrl ?? null); }} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Evaluation Result</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${evaluation.result === "PASS" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
              {evaluation.overallComplete ? evaluation.result : "INCOMPLETE"}
            </span>
          </div>
          {evaluation.overallComplete && evaluation.result === "FAIL" && (
            <div className="mt-3">
              <p className="text-sm font-semibold">Failure reasons</p>
              <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                {evaluation.failureReasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <div className="mt-3">
                <Field label="Required corrective action">
                  <textarea className={`${inputClass} min-h-20`} value={form.correctiveAction} onChange={(e) => set("correctiveAction", e.target.value)} placeholder="Example: Recalibrate instrument and request reinspection." />
                </Field>
              </div>
            </div>
          )}
          {evaluation.overallComplete && evaluation.result === "PASS" && (
            <p className="mt-2 text-sm text-muted-foreground">All inspection sections meet the configured evaluation criteria. A certificate will be generated when you submit the inspection.</p>
          )}
        </Card>

        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`text-sm font-bold ${evaluation.result === "PASS" ? "text-success" : "text-destructive"}`}>
            {evaluation.overallComplete ? `Overall result: ${evaluation.result}` : "Complete all sections to evaluate the inspection."}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant={evaluation.result === "PASS" ? "success" : "danger"} onClick={finish}>
              SUBMIT INSPECTION
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
