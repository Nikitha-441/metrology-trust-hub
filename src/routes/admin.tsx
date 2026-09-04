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
  StatusTimeline,
  FilePreview,
  ScheduleCard,
} from "@/components/ui-kit";
import { addOfficer, assignOfficer, certificateStatus, useAppState } from "@/lib/store";
import { ProfileSection } from "@/components/ProfileSection";
import { useRequireRole } from "@/lib/useAuth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administration — Legal Metrology Verification" },
      { name: "description", content: "Review, prioritize, assign, schedule and monitor Legal Metrology verification workflows." },
    ],
  }),
  component: AdminPage,
});

const TABS = ["Dashboard", "Applications", "Certificates", "Reports", "Stakeholders", "Profile"];
const STATUS_FILTERS = ["ALL", "SUBMITTED", "ASSIGNED", "SCHEDULED", "INSPECTION", "CORRECTION_REQUIRED", "REINSPECTION_REQUESTED", "CERTIFIED", "FAILED"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

function AdminPage() {
  const user = useRequireRole("ADMIN");
  const state = useAppState();
  const [tab, setTab] = useState("Dashboard");
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [officerModal, setOfficerModal] = useState(false);

  const applications = useMemo(
    () => [...state.applications].sort((a, b) => b.riskScore - a.riskScore || b.createdAt.localeCompare(a.createdAt)),
    [state.applications],
  );
  const filtered = applications.filter((a) =>
    (statusFilter === "ALL" || a.status === statusFilter) &&
    (priorityFilter === "ALL" || a.riskLevel === priorityFilter),
  );
  const stats = {
    pending: applications.filter((a) => a.status === "SUBMITTED").length,
    assigned: applications.filter((a) => a.status === "ASSIGNED").length,
    scheduled: applications.filter((a) => a.status === "SCHEDULED").length,
    inspection: applications.filter((a) => a.status === "INSPECTION").length,
    correction: applications.filter((a) => a.status === "CORRECTION_REQUIRED" || a.status === "REINSPECTION_REQUESTED").length,
    high: applications.filter((a) => a.riskLevel === "HIGH").length,
    overdue: state.instruments.filter((i) => i.overdue).length,
    activeCertificates: state.certificates.filter((c) => certificateStatus(c) === "ACTIVE").length,
    expiring: state.certificates.filter((c) => certificateStatus(c) === "EXPIRING SOON").length,
  };

  if (!user) return null;

  return (
    <AppShell user={user} title="Administration" tabs={TABS} active={tab} onTab={setTab}>
      {tab === "Dashboard" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pending Review" value={stats.pending} />
            <StatCard label="High Priority" value={stats.high} />
            <StatCard label="Scheduled" value={stats.scheduled} />
            <StatCard label="Correction / Reinspection" value={stats.correction} />
          </div>

          <Card>
            <SectionTitle>Operational Overview</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryButton label="Assigned" value={stats.assigned} onClick={() => { setTab("Applications"); setStatusFilter("ASSIGNED"); }} />
              <SummaryButton label="In inspection" value={stats.inspection} onClick={() => { setTab("Applications"); setStatusFilter("INSPECTION"); }} />
              <SummaryButton label="Overdue instruments" value={stats.overdue} onClick={() => { setTab("Applications"); setStatusFilter("ALL"); }} />
              <SummaryButton label="Expiring certificates" value={stats.expiring} onClick={() => { setTab("Certificates"); }} />
            </div>
          </Card>

          <div>
            <SectionTitle action={<Button variant="outline" onClick={() => { setTab("Applications"); setPriorityFilter("HIGH"); }}>VIEW HIGH PRIORITY</Button>}>Priority Applications</SectionTitle>
            <ApplicationTable applications={applications.slice(0, 6)} state={state} onOpen={setOpenId} />
          </div>

          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Regulatory Reference</p>
            <p className="mt-1 text-sm text-muted-foreground">Prototype workflow references the Legal Metrology Act, 2009 and Legal Metrology (General) Rules, 2011.</p>
            <a className="mt-2 inline-block text-sm font-semibold text-primary underline" href="https://consumeraffairs.gov.in/pages/legal-metrology-act" target="_blank" rel="noreferrer">Department of Consumer Affairs — Legal Metrology</a>
          </Card>
        </div>
      )}

      {tab === "Applications" && (
        <div className="space-y-5">
          <RecordSearch state={state} applications={applications} onOpen={setOpenId} label="SEARCH APPLICATIONS" placeholder="Application ID · serial · certificate number" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status"><select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>{STATUS_FILTERS.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></Field>
            <Field label="Priority"><select className={inputClass} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}><option value="ALL">ALL</option><option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option></select></Field>
          </div>
          <SectionTitle>{filtered.length} Applications</SectionTitle>
          <ApplicationTable applications={filtered} state={state} onOpen={setOpenId} />
        </div>
      )}

      {tab === "Certificates" && <CertificatesPanel state={state} />}
      {tab === "Reports" && <ReportsPanel state={state} applications={applications} />}
      {tab === "Stakeholders" && <StakeholdersPanel state={state} onAdd={() => setOfficerModal(true)} />}
      {tab === "Profile" && <ProfileSection user={user} />}

      {openId && <ApplicationModal applicationId={openId} onClose={() => setOpenId(null)} />}
      {officerModal && <AddOfficerModal onClose={() => setOfficerModal(false)} />}
    </AppShell>
  );
}

function SummaryButton({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-md border border-border bg-background p-4 text-left hover:bg-muted"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span><span className="mt-1 block text-2xl font-bold">{value}</span></button>;
}

function ApplicationTable({ applications, state, onOpen }: { applications: ReturnType<typeof useAppState>["applications"]; state: ReturnType<typeof useAppState>; onOpen: (id: string) => void }) {
  if (applications.length === 0) return <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No applications match these filters.</p>;
  return <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr>{["Application", "Instrument", "Priority", "Status", "Officer", "Action"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{applications.map((a) => { const inst = state.instruments.find((i) => i.id === a.instrumentId); const officer = state.users.find((u) => u.id === a.assignedOfficerId); const cert = state.certificates.find((c) => c.applicationId === a.id); return <tr key={a.id} className="border-t border-border"><td className="whitespace-nowrap px-3 py-3 font-semibold">{a.id}</td><td className="px-3 py-3">{inst?.type}<br /><span className="text-xs text-muted-foreground">{inst?.serialNumber}</span></td><td className="px-3 py-3"><RiskBadge level={a.riskLevel} score={a.riskScore} /></td><td className="px-3 py-3"><StatusBadge status={a.status} /><div className="mt-1 text-xs text-muted-foreground">{cert ? certificateStatus(cert) : ""}</div></td><td className="px-3 py-3">{officer ? `${officer.officerType ?? "Officer"} · ${officer.name}` : "—"}</td><td className="px-3 py-3"><Button variant="outline" onClick={() => onOpen(a.id)}>VIEW</Button></td></tr>; })}</tbody></table></div>;
}

function ApplicationModal({ applicationId, onClose }: { applicationId: string; onClose: () => void }) {
  const state = useAppState();
  const app = state.applications.find((a) => a.id === applicationId);
  const inst = state.instruments.find((i) => i.id === app?.instrumentId);
  const applicant = state.users.find((u) => u.id === app?.applicantId);
  const officers = state.users.filter((u) => u.role === "OFFICER");
  const [officerId, setOfficerId] = useState(app?.assignedOfficerId ?? officers[0]?.id ?? "");
  const [date, setDate] = useState(app?.schedule?.date ?? "");
  const [time, setTime] = useState(app?.schedule?.time ?? "");
  const [location, setLocation] = useState(app?.schedule?.location ?? inst?.location ?? "");
  const [msg, setMsg] = useState("");
  if (!app) return null;
  const cert = state.certificates.find((c) => c.applicationId === app.id);
  const insp = state.inspections.find((i) => i.applicationId === app.id);

  const saveAssignment = () => { if (!officerId) return setMsg("Select an officer."); assignOfficer(app.id, officerId); setMsg("Officer assigned."); };
  const saveSchedule = () => { if (!officerId || !date || !time || !location.trim()) return setMsg("Officer, date, time and location are required."); assignOfficer(app.id, officerId, { date, time, location: location.trim() }); setMsg("Inspection scheduled."); };

  return <Modal title={`Application ${app.id}`} onClose={onClose}><div className="space-y-4">
    <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{applicant?.name}</p><p className="text-sm text-muted-foreground">{inst?.type} · {inst?.serialNumber} · {app.verificationType}</p></div><div className="flex gap-2"><RiskBadge level={app.riskLevel} score={app.riskScore} /><StatusBadge status={app.status} /></div></div><div className="mt-3"><StatusTimeline status={app.status} /></div></Card>
    <Card><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Risk Factors</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{app.riskReasons.map((r) => <li key={r}>• {r}</li>)}</ul></Card>
    {app.schedule && <ScheduleCard schedule={app.schedule} officerName={state.users.find((u) => u.id === app.assignedOfficerId)?.name} />}
    {app.status === "CORRECTION_REQUIRED" || app.status === "REINSPECTION_REQUESTED" ? <Card><p className="text-xs font-bold uppercase tracking-wide text-destructive">Correction / Reinspection</p><p className="mt-2 text-sm">{app.failureReasons?.join(", ") || "Reinspection requested."}</p><p className="mt-1 text-sm"><span className="font-semibold">Corrective action:</span> {app.correctiveAction || "—"}</p></Card> : null}
    {insp && <Card><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Inspection Result</p><p className={`mt-1 font-bold ${insp.result === "PASS" ? "text-success" : "text-destructive"}`}>{insp.result}</p><p className="text-sm text-muted-foreground">{new Date(insp.inspectedAt).toLocaleString("en-GB")}</p>{insp.remarks && <p className="mt-2 text-sm">{insp.remarks}</p>}</Card>}
    {((app.instrumentPhoto || app.supportingDocument) || (insp && (insp.inspectionPhoto || insp.evidencePhoto))) && <Card><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Evidence</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{app.instrumentPhoto && <FilePreview file={app.instrumentPhoto} compact />}{app.supportingDocument && <FilePreview file={app.supportingDocument} compact />}{insp?.inspectionPhoto && <FilePreview file={insp.inspectionPhoto} compact />}{insp?.evidencePhoto && <FilePreview file={insp.evidencePhoto} compact />}</div></Card>}
    {!['CERTIFIED', 'FAILED', 'INSPECTION', 'REINSPECTION_REQUESTED'].includes(app.status) && <Card><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Assign & Schedule</p><div className="mt-3 space-y-3"><Field label="Officer"><select className={inputClass} value={officerId} onChange={(e) => setOfficerId(e.target.value)}>{officers.map((o) => <option key={o.id} value={o.id}>{o.officerType} · {o.name}</option>)}</select></Field><div className="grid gap-3 sm:grid-cols-3"><Field label="Date"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Time"><input type="time" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} /></Field><Field label="Location"><input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} /></Field></div>{msg && <p className="text-sm font-semibold text-success">{msg}</p>}<div className="flex flex-wrap gap-2"><Button onClick={saveAssignment}>ASSIGN</Button><Button variant="success" onClick={saveSchedule}>ASSIGN & SCHEDULE</Button></div></div></Card>}
    {app.status === "REINSPECTION_REQUESTED" && <Card><p className="text-sm font-semibold">This application is already in the reinspection workflow. Assign and schedule it like any other application after review.</p><div className="mt-3"><Button onClick={() => { if (!officerId) return setMsg("Select an officer."); assignOfficer(app.id, officerId); setMsg("Reinspection assigned."); }}>ASSIGN REINSPECTION</Button></div>{msg && <p className="mt-2 text-sm font-semibold text-success">{msg}</p>}</Card>}
    {cert && <Card><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Certificate</p><p className="mt-1 font-semibold">{cert.certificateNumber}</p><p className="text-sm text-muted-foreground">Issued {cert.issueDate} · Valid until {cert.validUntil}</p><div className="mt-3 flex flex-wrap gap-2"><Link to="/certificate/$certificateNumber" params={{ certificateNumber: cert.certificateNumber }}><Button variant="outline">VIEW CERTIFICATE</Button></Link><DownloadPdfButton certificateNumber={cert.certificateNumber} state={state} /></div></Card>}
  </div></Modal>;
}

function CertificatesPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const certs = [...state.certificates].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  return <div className="space-y-5"><SectionTitle>Certificate Registry</SectionTitle><div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr>{["Certificate", "Instrument", "Owner", "Status", "Valid Until", "Action"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{certs.map((c) => { const app = state.applications.find((a) => a.id === c.applicationId); const inst = state.instruments.find((i) => i.id === app?.instrumentId); const owner = state.users.find((u) => u.id === app?.applicantId); return <tr key={c.id} className="border-t border-border"><td className="px-3 py-3 font-semibold">{c.certificateNumber}</td><td className="px-3 py-3">{inst?.type}<br /><span className="text-xs text-muted-foreground">{inst?.serialNumber}</span></td><td className="px-3 py-3">{owner?.name}</td><td className="px-3 py-3">{certificateStatus(c)}</td><td className="px-3 py-3">{c.validUntil}</td><td className="px-3 py-3"><div className="flex gap-2"><Link to="/certificate/$certificateNumber" params={{ certificateNumber: c.certificateNumber }}><Button variant="outline">VIEW</Button></Link><DownloadPdfButton certificateNumber={c.certificateNumber} state={state} /></div></td></tr>; })}</tbody></table></div></div>;
}

function ReportsPanel({ state, applications }: { state: ReturnType<typeof useAppState>; applications: ReturnType<typeof useAppState>["applications"] }) {
  const rows = [
    ["Submitted", applications.filter((a) => a.status === "SUBMITTED").length],
    ["Assigned", applications.filter((a) => a.status === "ASSIGNED").length],
    ["Scheduled", applications.filter((a) => a.status === "SCHEDULED").length],
    ["In inspection", applications.filter((a) => a.status === "INSPECTION").length],
    ["Correction required", applications.filter((a) => a.status === "CORRECTION_REQUIRED").length],
    ["Reinspection requested", applications.filter((a) => a.status === "REINSPECTION_REQUESTED").length],
    ["Certified", applications.filter((a) => a.status === "CERTIFIED").length],
    ["Failed", applications.filter((a) => a.status === "FAILED").length],
  ] as const;
  const exportCsv = () => {
    const header = "Application ID,Instrument,Serial,Priority,Status,Officer,Created At";
    const body = applications.map((a) => { const i = state.instruments.find((x) => x.id === a.instrumentId); const o = state.users.find((x) => x.id === a.assignedOfficerId); return [a.id, i?.type ?? "", i?.serialNumber ?? "", a.riskLevel, a.status, o?.name ?? "", a.createdAt].map((x) => `"${String(x).replaceAll('"', '""')}"`).join(","); }).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "legal-metrology-applications.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-5"><SectionTitle action={<div className="flex gap-2"><Button variant="outline" onClick={exportCsv}>EXPORT CSV</Button><Button onClick={() => window.print()}>PRINT REPORT</Button></div>}>Reports</SectionTitle><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{rows.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}</div><Card><p className="text-sm font-semibold">Certificate lifecycle</p><div className="mt-3 grid gap-2 sm:grid-cols-4"><div>Active: <b>{state.certificates.filter((c) => certificateStatus(c) === "ACTIVE").length}</b></div><div>Expiring: <b>{state.certificates.filter((c) => certificateStatus(c) === "EXPIRING SOON").length}</b></div><div>Expired: <b>{state.certificates.filter((c) => certificateStatus(c) === "EXPIRED").length}</b></div><div>Revoked: <b>{state.certificates.filter((c) => certificateStatus(c) === "REVOKED").length}</b></div></div></Card><Card><p className="text-sm font-semibold">Officer workload</p><div className="mt-3 space-y-2">{state.users.filter((u) => u.role === "OFFICER").map((o) => <div key={o.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0"><span>{o.officerType} · {o.name}</span><span className="text-muted-foreground">{applications.filter((a) => a.assignedOfficerId === o.id && !["CERTIFIED","FAILED","CORRECTION_REQUIRED"].includes(a.status)).length} active assignments · {applications.filter((a) => a.assignedOfficerId === o.id && a.status === "CERTIFIED").length} certified</span></div>)}</div></Card><Card><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Report note</p><p className="mt-1 text-sm text-muted-foreground">CSV export and print are generated from current prototype state. No backend reporting engine is required for this demo.</p></Card></div>;
}

function StakeholdersPanel({ state, onAdd }: { state: ReturnType<typeof useAppState>; onAdd: () => void }) {
  const officers = state.users.filter((u) => u.role === "OFFICER");
  const citizens = state.users.filter((u) => u.role === "CITIZEN");
  const admins = state.users.filter((u) => u.role === "ADMIN");
  return <div className="space-y-5"><SectionTitle action={<Button onClick={onAdd}>+ ADD LMO / GATC</Button>}>Stakeholders</SectionTitle><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Citizens" value={citizens.length} /><StatCard label="LMO / GATC" value={officers.length} /><StatCard label="Admins" value={admins.length} /></div><div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Organization</th><th className="px-3 py-2">Contact</th></tr></thead><tbody>{state.users.map((u) => <tr key={u.id} className="border-t border-border"><td className="px-3 py-3 font-semibold">{u.name}</td><td className="px-3 py-3">{u.officerType ? `${u.officerType} · ${u.role}` : u.role}</td><td className="px-3 py-3">{u.organization || u.department || "—"}</td><td className="px-3 py-3">{u.email}{u.phone ? ` · ${u.phone}` : ""}</td></tr>)}</tbody></table></div></div>;
}

function AddOfficerModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", organization: "", officerType: "LMO" as "LMO" | "GATC", officerId: "", designation: "", department: "", password: "demo123" });
  const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return <Modal title="Add LMO / GATC account" onClose={onClose}><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setError(""); const res = addOfficer(form); if (!res.ok) return setError(res.error); setSaved("Account created successfully."); }}><div className="grid gap-3 sm:grid-cols-2"><Field label="Full name"><input required className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field><Field label="Email"><input required type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field><Field label="Type"><select className={inputClass} value={form.officerType} onChange={(e) => set("officerType", e.target.value)}><option>LMO</option><option>GATC</option></select></Field><Field label="Officer ID / Centre ID"><input className={inputClass} value={form.officerId} onChange={(e) => set("officerId", e.target.value)} /></Field><Field label="Organization"><input className={inputClass} value={form.organization} onChange={(e) => set("organization", e.target.value)} /></Field><Field label="Department"><input className={inputClass} value={form.department} onChange={(e) => set("department", e.target.value)} /></Field></div>{error && <p className="text-sm font-semibold text-destructive">{error}</p>}{saved && <p className="text-sm font-semibold text-success">{saved}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="submit">Create Account</Button></div></form></Modal>;
}
