import { useSyncExternalStore } from "react";
import type {
  AppState,
  Application,
  Certificate,
  CertificateStatus,
  Inspection,
  Instrument,
  Notification,
  Schedule,
  UploadedFile,
  User,
  FailureReason,
} from "./types";
import { seedState } from "./seed";
import { computeRisk } from "./risk";
import { evaluateInspection } from "./inspection";

const KEY = "lmvs-state-v1";

let state: AppState = seedState();
let loaded = false;
const listeners = new Set<() => void>();

/* ---------------- certificate validity configuration ---------------- */

/**
 * Demo configuration only — NOT a statement of statutory validity periods.
 * Adjust freely; unknown types fall back to DEFAULT_VALIDITY_MONTHS.
 */
export const VALIDITY_MONTHS_BY_TYPE: Record<string, number> = {
  "Fuel Dispenser": 12,
  "Petrol Pump Flow Meter": 12,
  "Bulk Flow Meter": 12,
  Weighbridge: 12,
  "Electronic Weighing Scale": 12,
  "Counter Scale": 12,
  "Beam Scale": 12,
  "Measuring Tape": 12,
};

export const DEFAULT_VALIDITY_MONTHS = 12;
export const EXPIRING_SOON_DAYS = 90;

export function validityMonthsFor(instrumentType: string | undefined) {
  return (instrumentType && VALIDITY_MONTHS_BY_TYPE[instrumentType]) || DEFAULT_VALIDITY_MONTHS;
}

export function daysUntil(dateStr: string) {
  const end = new Date(`${dateStr}T23:59:59`).getTime();
  return Math.ceil((end - Date.now()) / 86400000);
}

/** Derived certificate status — always compute, never trust a stored ACTIVE. */
export function certificateStatus(cert: Certificate): CertificateStatus {
  if (cert.status === "REVOKED") return "REVOKED";
  const days = daysUntil(cert.validUntil);
  if (days < 0) return "EXPIRED";
  if (days <= EXPIRING_SOON_DAYS) return "EXPIRING SOON";
  return "ACTIVE";
}

/* ---------------- persistence ---------------- */

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...seedState(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  if (!Array.isArray(state.notifications)) state.notifications = [];
  syncDerived();
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  load();
  return state;
}

function getServerSnapshot() {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getState() {
  load();
  return state;
}

function set(next: Partial<AppState>) {
  state = { ...state, ...next };
  syncDerived();
  persist();
}

export function refreshDerivedState() {
  load();
  syncDerived();
  persist();
}

export function resetDemoData() {
  const currentUserId = state.currentUserId;
  state = { ...seedState(), currentUserId };
  syncDerived();
  persist();
}

/* ---------------- derived lifecycle + notifications ---------------- */

/**
 * Idempotent. Mutates `state` in place:
 *  - flags instruments overdue when their certificate has expired
 *  - creates any missing notifications using deterministic IDs (never duplicates)
 * Safe to run on load and after every mutation.
 */
function syncDerived() {
  const instruments = [...state.instruments];
  let instrumentsChanged = false;

  const wanted: Notification[] = [];
  const admins = state.users.filter((u) => u.role === "ADMIN");
  const push = (userIds: string[], id: string, message: string, createdAt: string) => {
    userIds.forEach((userId) => wanted.push({ id: `${id}::${userId}`, userId, message, createdAt, read: false }));
  };

  const instrumentFor = (applicationId: string) => {
    const app = state.applications.find((a) => a.id === applicationId);
    return app ? instruments.find((i) => i.id === app.instrumentId) : undefined;
  };

  /* instruments → current verification reflects the LATEST certificate for that instrument.
   * Use issueDate first so an older historical certificate can never override a newer one. */
  const latestCertByInstrument = new Map<string, Certificate>();
  for (const cert of state.certificates) {
    const inst = instrumentFor(cert.applicationId);
    if (!inst) continue;
    const prev = latestCertByInstrument.get(inst.id);
    if (
      !prev ||
      cert.issueDate > prev.issueDate ||
      (cert.issueDate === prev.issueDate && cert.validUntil > prev.validUntil)
    ) {
      latestCertByInstrument.set(inst.id, cert);
    }
  }
  latestCertByInstrument.forEach((cert, instrumentId) => {
    const idx = instruments.findIndex((i) => i.id === instrumentId);
    const current = instruments[idx];
    if (!current) return;
    const shouldBeOverdue = certificateStatus(cert) === "EXPIRED";
    if (current.overdue !== shouldBeOverdue) {
      instruments[idx] = { ...current, overdue: shouldBeOverdue };
      instrumentsChanged = true;
    }
  });

  /* certificates → expiry lifecycle. Only the LATEST certificate can create
   * current expiry/verification-required notifications. Historical certificates
   * remain visible but must not keep generating active alerts. */
  for (const cert of state.certificates) {
    const status = certificateStatus(cert);
    const app = state.applications.find((a) => a.id === cert.applicationId);
    const inst = instrumentFor(cert.applicationId);
    const latest = inst ? latestCertByInstrument.get(inst.id) : undefined;
    const isLatest = !inst || latest?.id === cert.id;
    const label = inst ? `${inst.type} (${inst.serialNumber})` : cert.certificateNumber;

    if (app && isLatest && status === "EXPIRED") {
      push(
        [app.applicantId],
        `n-cert-expired-${cert.id}`,
        `VERIFICATION REQUIRED — certificate ${cert.certificateNumber} for ${label} expired on ${cert.validUntil}.`,
        `${cert.validUntil}T00:00:00.000Z`,
      );
      push(
        admins.map((a) => a.id),
        `n-adm-cert-expired-${cert.id}`,
        `Overdue instrument: ${label} — certificate ${cert.certificateNumber} expired ${cert.validUntil}.`,
        `${cert.validUntil}T00:00:00.000Z`,
      );
    }
    if (app && isLatest && status === "EXPIRING SOON") {
      push(
        [app.applicantId],
        `n-cert-expiring-${cert.id}`,
        `Certificate ${cert.certificateNumber} for ${label} expires on ${cert.validUntil} (${daysUntil(cert.validUntil)} days). Re-verification required.`,
        new Date().toISOString(),
      );
    }
    if (app && status !== "REVOKED") {
      push(
        [app.applicantId],
        `n-cert-issued-${cert.id}`,
        `Certificate ${cert.certificateNumber} issued for ${label}, valid until ${cert.validUntil}.`,
        `${cert.issueDate}T00:00:00.000Z`,
      );
    }
  }

  /* applications → workflow notifications */
  for (const app of state.applications) {
    const inst = instruments.find((i) => i.id === app.instrumentId);
    const label = inst ? `${inst.type} (${inst.serialNumber})` : app.instrumentId;

    push(
      admins.map((a) => a.id),
      `n-app-submitted-${app.id}`,
      `New application ${app.id} submitted for ${label}.`,
      app.createdAt,
    );
    if (app.riskLevel === "HIGH") {
      push(
        admins.map((a) => a.id),
        `n-app-highrisk-${app.id}`,
        `HIGH RISK application ${app.id} (${app.riskScore}/100) for ${label}.`,
        app.createdAt,
      );
    }
    if (app.assignedOfficerId) {
      push(
        [app.assignedOfficerId],
        `n-assign-${app.id}-${app.assignedOfficerId}`,
        `New assignment: ${app.id} — ${label}.`,
        app.createdAt,
      );
      push(
        [app.applicantId],
        `n-cit-assign-${app.id}-${app.assignedOfficerId}`,
        `Officer assigned to application ${app.id}.`,
        app.createdAt,
      );
    }
    if (app.schedule?.date) {
      const key = `${app.id}-${app.schedule.date}-${app.schedule.time}`;
      push(
        [app.applicantId],
        `n-sched-${key}`,
        `Inspection scheduled for ${app.id} on ${app.schedule.date} at ${app.schedule.time}.`,
        new Date().toISOString(),
      );
      if (app.assignedOfficerId) {
        push(
          [app.assignedOfficerId],
          `n-off-sched-${key}`,
          `Inspection scheduled: ${app.id} on ${app.schedule.date} at ${app.schedule.time} — ${app.schedule.location}.`,
          new Date().toISOString(),
        );
        const d = daysUntil(app.schedule.date);
        if (d >= 0 && d <= 7 && !["CERTIFIED", "FAILED"].includes(app.status)) {
          push(
            [app.assignedOfficerId],
            `n-off-upcoming-${key}`,
            `Upcoming inspection in ${d} day(s): ${app.id} — ${label}.`,
            new Date().toISOString(),
          );
        }
      }
    }
  }

  /* correction/reinspection lifecycle notifications */
  for (const app of state.applications) {
    const inst = instruments.find((i) => i.id === app.instrumentId);
    const label = inst ? `${inst.type} (${inst.serialNumber})` : app.instrumentId;
    if (app.status === "CORRECTION_REQUIRED") {
      push(
        [app.applicantId],
        `n-correction-${app.id}`,
        `Correction required for ${app.id} — ${label}. Review the failure reasons and request reinspection after correction.`,
        app.createdAt,
      );
      if (app.assignedOfficerId) {
        push(
          [app.assignedOfficerId],
          `n-correction-off-${app.id}`,
          `Inspection ${app.id} failed. Awaiting correction and reinspection request.`,
          app.createdAt,
        );
      }
    }
    if (app.status === "REINSPECTION_REQUESTED") {
      push(
        admins.map((a) => a.id),
        `n-reinspection-admin-${app.id}`,
        `Reinspection requested for ${app.id} — ${label}.`,
        app.reinspectionRequestedAt ?? app.createdAt,
      );
    }
  }

  /* inspections → result notifications */
  for (const insp of state.inspections) {
    const app = state.applications.find((a) => a.id === insp.applicationId);
    if (!app) continue;
    const inst = instruments.find((i) => i.id === app.instrumentId);
    const label = inst ? `${inst.type} (${inst.serialNumber})` : app.instrumentId;
    const key = `${insp.applicationId}-${insp.result}`;
    push(
      [app.applicantId],
      `n-insp-${key}`,
      insp.result === "PASS"
        ? `Inspection completed for ${app.id} — PASSED.`
        : `Inspection FAILED for ${app.id}: ${insp.remarks}`,
      insp.inspectedAt,
    );
    push(
      admins.map((a) => a.id),
      `n-adm-insp-${key}`,
      insp.result === "PASS"
        ? `Inspection completed: ${app.id} — ${label} PASSED.`
        : `Failed inspection: ${app.id} — ${label}.`,
      insp.inspectedAt,
    );
  }

  /* Remove expiry notifications that are no longer current. Historical
   * certificates remain in the registry, but they must not continue to tell
   * users that re-verification is required after a newer certificate exists. */
  const staleExpiryIds = new Set<string>();
  for (const cert of state.certificates) {
    const inst = instrumentFor(cert.applicationId);
    const latest = inst ? latestCertByInstrument.get(inst.id) : undefined;
    const isLatest = !inst || latest?.id === cert.id;
    const status = certificateStatus(cert);
    if (!isLatest || !["EXPIRED", "EXPIRING SOON"].includes(status)) {
      for (const prefix of [
        `n-cert-expired-${cert.id}`,
        `n-adm-cert-expired-${cert.id}`,
        `n-cert-expiring-${cert.id}`,
      ]) {
        state.notifications
          .filter((n) => n.id === `${prefix}::${n.userId}`)
          .forEach((n) => staleExpiryIds.add(n.id));
      }
    }
  }

  if (instrumentsChanged) state.instruments = instruments;

  // Keep application risk synchronized with the instrument's current lifecycle.
  // This means risk changes automatically after failures, expiry, and successful re-verification.
  state.applications = state.applications.map((app) => {
    const instrument = state.instruments.find((i) => i.id === app.instrumentId);
    if (!instrument) return app;
    const nextRisk = computeRisk(instrument);
    if (
      app.riskScore === nextRisk.riskScore &&
      app.riskLevel === nextRisk.riskLevel &&
      app.riskReasons.join("|") === nextRisk.riskReasons.join("|")
    ) return app;
    return { ...app, ...nextRisk };
  });

  const retained = state.notifications.filter((n) => !staleExpiryIds.has(n.id));
  const existing = new Set(retained.map((n) => n.id));
  const missing = wanted.filter((n) => !existing.has(n.id));
  if (missing.length > 0 || retained.length !== state.notifications.length) {
    state.notifications = [...retained, ...missing].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}

/* ---------------- notifications ---------------- */

export function notificationsFor(userId: string) {
  return state.notifications.filter((n) => n.userId === userId);
}

export function markNotificationsRead(userId: string) {
  set({
    notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
  });
}

/* ---------------- auth ---------------- */

export function login(email: string, password: string): { ok: boolean; error?: string } {
  load();
  const normalizedEmail = email.trim().toLowerCase();
  const user = state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) return { ok: false, error: "No account found with that email." };
  const valid = user.password ? user.password === password : password === "demo123";
  if (!valid) return { ok: false, error: "Invalid credentials." };
  set({ currentUserId: user.id });
  return { ok: true };
}

export function registerCitizen(data: {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
}) {
  load();
  const email = data.email.trim().toLowerCase();
  if (!data.name.trim() || !email || !data.phone.trim() || !data.address.trim()) {
    return { ok: false, error: "Complete all registration fields." as const };
  }
  if (data.password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." as const };
  }
  if (state.users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, error: "An account with this email already exists." as const };
  }
  const user: User = {
    id: `u-cit-${Date.now()}`,
    name: data.name.trim(),
    email,
    role: "CITIZEN",
    phone: data.phone.trim(),
    address: data.address.trim(),
    password: data.password,
  };
  set({ users: [...state.users, user], currentUserId: user.id });
  return { ok: true, user };
}

export function logout() {
  set({ currentUserId: null });
}

export function currentUser() {
  load();
  return state.users.find((u) => u.id === state.currentUserId) ?? null;
}

/* ---------------- mutations ---------------- */

export function addInstrument(
  data: Omit<Instrument, "id" | "ownerId" | "verificationStatus" | "validUntil">,
  ownerId: string,
) {
  const instrument: Instrument = {
    ...data,
    id: `i-${Date.now()}`,
    ownerId,
    verificationStatus: "UNVERIFIED",
    validUntil: null,
  };
  set({ instruments: [...state.instruments, instrument] });
  return instrument;
}

let seq = 1006;
function nextAppId() {
  seq = Math.max(
    seq,
    ...state.applications.map((a) => Number(a.id.replace("LM-APP-", "")) || 0),
  );
  seq += 1;
  return `LM-APP-${seq}`;
}

export function createApplication(
  instrumentId: string,
  applicantId: string,
  verificationType: Application["verificationType"],
  docs?: { instrumentPhoto?: UploadedFile | null; supportingDocument?: UploadedFile | null },
) {
  const instrument = state.instruments.find((i) => i.id === instrumentId)!;
  const app: Application = {
    id: nextAppId(),
    instrumentId,
    applicantId,
    assignedOfficerId: null,
    verificationType,
    status: "SUBMITTED",
    createdAt: new Date().toISOString(),
    schedule: null,
    instrumentPhoto: docs?.instrumentPhoto ?? null,
    supportingDocument: docs?.supportingDocument ?? null,
    // risk snapshot at submission time — includes overdue caused by an expired certificate
    ...computeRisk(instrument),
  };
  set({
    applications: [...state.applications, app],
    instruments: state.instruments.map((i) =>
      i.id === instrumentId ? { ...i, verificationStatus: "PENDING" } : i,
    ),
  });
  return app;
}

export function assignOfficer(applicationId: string, officerId: string, schedule?: Schedule | null) {
  set({
    applications: state.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            assignedOfficerId: officerId,
            schedule: schedule ?? a.schedule ?? null,
            status: schedule ? "SCHEDULED" : a.schedule ? "SCHEDULED" : "ASSIGNED",
          }
        : a,
    ),
  });
}

/** SCHEDULED / ASSIGNED → INSPECTION when the officer opens the inspection form. */
export function startInspection(applicationId: string) {
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app || !["ASSIGNED", "SCHEDULED"].includes(app.status)) return;
  set({
    applications: state.applications.map((a) =>
      a.id === applicationId ? { ...a, status: "INSPECTION" } : a,
    ),
  });
}

export function requestReinspection(applicationId: string, applicantId: string) {
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app || app.applicantId !== applicantId || app.status !== "CORRECTION_REQUIRED") return null;
  const instrument = state.instruments.find((i) => i.id === app.instrumentId);
  if (!instrument) return null;
  const createdAt = new Date().toISOString();
  const newApp: Application = {
    id: nextAppId(),
    instrumentId: app.instrumentId,
    applicantId,
    assignedOfficerId: null,
    verificationType: "RE-VERIFICATION",
    status: "SUBMITTED",
    riskScore: computeRisk(instrument).riskScore,
    riskLevel: computeRisk(instrument).riskLevel,
    riskReasons: computeRisk(instrument).riskReasons,
    createdAt,
    schedule: null,
    instrumentPhoto: null,
    supportingDocument: null,
    previousApplicationId: app.id,
    reinspectionRequestedAt: createdAt,
  };
  set({
    applications: [
      ...state.applications.map((a) =>
        a.id === applicationId ? { ...a, status: "REINSPECTION_REQUESTED", reinspectionRequestedAt: createdAt } : a,
      ),
      newApp,
    ],
    instruments: state.instruments.map((i) =>
      i.id === app.instrumentId ? { ...i, verificationStatus: "PENDING", previousFailure: true } : i,
    ),
  });
  return newApp;
}

export function updateProfile(userId: string, data: Partial<User>) {
  set({
    users: state.users.map((u) => (u.id === userId ? { ...u, ...data } : u)),
  });
}

export function addOfficer(data: { name: string; email: string; phone?: string; organization?: string; officerType: "LMO" | "GATC"; officerId?: string; designation?: string; department?: string; password?: string }) {
  load();
  const email = data.email.trim().toLowerCase();
  if (!data.name.trim() || !email) return { ok: false as const, error: "Name and email are required." };
  if (state.users.some((u) => u.email.toLowerCase() === email)) return { ok: false as const, error: "An account with this email already exists." };
  const user: User = {
    id: `u-off-${Date.now()}`,
    name: data.name.trim(),
    email,
    role: "OFFICER",
    officerType: data.officerType,
    phone: data.phone?.trim(),
    organization: data.organization?.trim(),
    officerId: data.officerId?.trim(),
    designation: data.designation?.trim(),
    department: data.department?.trim(),
    password: data.password?.trim() || "demo123",
  };
  set({ users: [...state.users, user] });
  return { ok: true as const, user };
}

function nextCertificateNumber(year: number) {
  const prefix = `LM-${year}-`;
  const highest = state.certificates
    .filter((c) => c.certificateNumber.startsWith(prefix))
    .reduce((max, c) => Math.max(max, Number(c.certificateNumber.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

export function completeInspection(
  applicationId: string,
  data: Omit<Inspection, "applicationId" | "inspectedAt">,
) {
  const app = state.applications.find((a) => a.id === applicationId)!;
  if (!app) return null;
  const normalizedVisual = Object.fromEntries(
    Object.entries(data.visualChecks ?? {}).map(([k, v]) => [k, v === true ? "PASS" : v === false ? "FAIL" : v]),
  ) as Record<string, "PASS" | "FAIL" | "">;
  const normalizedEccentric = Object.fromEntries(
    Object.entries(data.eccentricLoadingChecks ?? {}).map(([k, v]) => [k, v === true ? "PASS" : v === false ? "FAIL" : v]),
  ) as Record<string, "PASS" | "FAIL" | "">;
  const evaluation = evaluateInspection({
    visualChecks: normalizedVisual,
    repeatabilityReadings: data.repeatabilityReadings ?? [],
    accuracyTests: data.accuracyTests ?? [],
    eccentricLoadingChecks: normalizedEccentric,
  });
  if (!evaluation.overallComplete) throw new Error("Complete every inspection field before submitting the inspection.");
  if (data.result !== evaluation.result) throw new Error("Inspection result changed unexpectedly. Review the recorded values and submit again.");
  if (evaluation.result === "FAIL" && (!evaluation.failureReasons.length || !data.correctiveAction?.trim() || !data.remarks?.trim())) {
    throw new Error("Failure reasons, officer remarks, and corrective action are required.");
  }
  const inspection: Inspection = {
    ...data,
    visualChecks: normalizedVisual,
    eccentricLoadingChecks: normalizedEccentric,
    failureReasons: evaluation.failureReasons,
    repeatabilityResult: evaluation.repeatabilityPass ? "PASS" : "FAIL",
    applicationId,
    inspectedAt: new Date().toISOString(),
  };
  const inspections = [
    ...state.inspections.filter((i) => i.applicationId !== applicationId),
    inspection,
  ];

  if (data.result === "PASS") {
    const instrument = state.instruments.find((i) => i.id === app.instrumentId);
    const months = validityMonthsFor(instrument?.type);
    const issue = new Date();
    const valid = new Date(issue);
    valid.setMonth(valid.getMonth() + months);
    const cert: Certificate = {
      id: `cert-${Date.now()}`,
      applicationId,
      certificateNumber: nextCertificateNumber(issue.getFullYear()),
      issueDate: issue.toISOString().slice(0, 10),
      validUntil: valid.toISOString().slice(0, 10),
      validityMonths: months,
      status: "ACTIVE",
      qrToken: `qr-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    };
    set({
      inspections,
      certificates: [...state.certificates, cert],
      applications: state.applications.map((a) =>
        a.id === applicationId ? { ...a, status: "CERTIFIED" } : a,
      ),
      instruments: state.instruments.map((i) =>
        i.id === app.instrumentId
          ? { ...i, verificationStatus: "VERIFIED", validUntil: cert.validUntil, previousFailure: false, overdue: false }
          : i,
      ),
    });
    return cert;
  }

  set({
    inspections,
    applications: state.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            status: "CORRECTION_REQUIRED",
            failureReasons: data.failureReasons ?? [],
            correctiveAction: data.correctiveAction ?? "",
            officerRemarks: data.remarks ?? "",
          }
        : a,
    ),
    instruments: state.instruments.map((i) =>
      i.id === app.instrumentId
        ? { ...i, verificationStatus: "REJECTED", previousFailure: true }
        : i,
    ),
  });
  return null;
}
