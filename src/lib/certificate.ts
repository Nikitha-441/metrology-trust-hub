import { certificateStatus, getState } from "./store";
import type {
  AppState,
  Application,
  Certificate,
  CertificateStatus,
  Inspection,
  Instrument,
  User,
} from "./types";

/**
 * Single source of truth for everything shown on the certificate page,
 * the PDF and the public verification page. Always derived from app state —
 * never duplicated as frontend constants.
 */
export type CertificateView = {
  certificate: Certificate;
  status: CertificateStatus;
  application: Application | undefined;
  instrument: Instrument | undefined;
  owner: User | undefined;
  officer: User | undefined;
  inspection: Inspection | undefined;
  verificationUrl: string;
};

type PublicQrPayload = {
  v: 1;
  n: string;
  i: string;
  s: string;
  o: string;
  issued: string;
  until: string;
  result: "PASS" | "FAIL";
};

function encodePublicQrPayload(payload: PublicQrPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodePublicQrPayload(raw: string | null): PublicQrPayload | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<PublicQrPayload>;
    if (value.v !== 1 || typeof value.n !== "string" || typeof value.i !== "string" ||
        typeof value.s !== "string" || typeof value.o !== "string" ||
        typeof value.issued !== "string" || typeof value.until !== "string" ||
        (value.result !== "PASS" && value.result !== "FAIL")) return null;
    return value as PublicQrPayload;
  } catch {
    return null;
  }
}

export function verificationPath(certificateNumber: string) {
  return `/verify/${encodeURIComponent(certificateNumber)}`;
}

/**
 * Public, shareable origin of this application — the URL a phone can open
 * after scanning a certificate QR code.
 *
 * Priority:
 *  1. VITE_PUBLIC_APP_ORIGIN (recommended for deployed/custom domains)
 *  2. the current runtime origin
 *
 * For local development, QR codes can only be scanned by another device if
 * VITE_PUBLIC_APP_ORIGIN is set to a publicly reachable URL.
 */
export function publicOrigin(): string {
  const configured = import.meta.env["VITE_PUBLIC_APP_ORIGIN"] as string | undefined;
  if (configured?.trim()) return configured.trim().replace(/\/+$/, "");
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function verificationUrl(certificateNumber: string, payload?: PublicQrPayload) {
  const query = payload ? `?p=${encodePublicQrPayload(payload)}` : "";
  return `${publicOrigin()}${verificationPath(certificateNumber)}${query}`;
}


export function buildCertificateView(
  certificateNumber: string,
  state: AppState = getState(),
): CertificateView | null {
  const key = certificateNumber.trim().toUpperCase();
  const certificate = state.certificates.find(
    (c) => c.certificateNumber.toUpperCase() === key || c.qrToken.toUpperCase() === key,
  );
  if (!certificate) return null;

  const application = state.applications.find((a) => a.id === certificate.applicationId);
  const instrument = state.instruments.find((i) => i.id === application?.instrumentId);
  const owner = state.users.find((u) => u.id === application?.applicantId);
  const officer = state.users.find((u) => u.id === application?.assignedOfficerId);
  const inspection = state.inspections.find((i) => i.applicationId === certificate.applicationId);
  const payload: PublicQrPayload = {
    v: 1,
    n: certificate.certificateNumber,
    i: instrument?.type ?? "",
    s: instrument?.serialNumber ?? "",
    o: owner?.name ?? "",
    issued: certificate.issueDate,
    until: certificate.validUntil,
    result: inspection?.result === "FAIL" ? "FAIL" : "PASS",
  };

  return {
    certificate,
    status: certificateStatus(certificate),
    application,
    instrument,
    owner,
    officer,
    inspection,
    verificationUrl: verificationUrl(certificate.certificateNumber, payload),
  };
}

export function buildPublicCertificateView(
  certificateNumber: string,
  payload: PublicQrPayload,
): CertificateView | null {
  if (payload.n.trim().toUpperCase() !== certificateNumber.trim().toUpperCase()) return null;
  const certificate: Certificate = {
    id: `public-${payload.n}`,
    applicationId: "public",
    certificateNumber: payload.n,
    issueDate: payload.issued,
    validUntil: payload.until,
    status: "ACTIVE",
    qrToken: "public-qr",
  };
  const instrument: Instrument = {
    id: "public-instrument",
    ownerId: "public-owner",
    type: payload.i,
    make: "",
    model: "",
    serialNumber: payload.s,
    capacity: "",
    unit: "",
    location: "",
    verificationStatus: "VERIFIED",
    validUntil: payload.until,
  };
  const owner: User = {
    id: "public-owner",
    name: payload.o,
    email: "",
    role: "CITIZEN",
  };
  const inspection: Inspection = {
    applicationId: "public",
    result: payload.result,
    zeroError: "",
    standardReading1: "",
    standardReading2: "",
    remarks: "",
    evidence: null,
    inspectedAt: payload.issued,
  };
  return {
    certificate,
    status: certificateStatus(certificate),
    application: undefined,
    instrument,
    owner,
    officer: undefined,
    inspection,
    verificationUrl: verificationUrl(certificate.certificateNumber, payload),
  };
}

export function officerDesignation(officer: User | undefined) {
  if (!officer) return "—";
  if (officer.designation) return officer.designation;
  return officer.officerType === "GATC"
    ? "Government Approved Test Centre Officer"
    : "Legal Metrology Officer";
}

export function certificateFileName(certificateNumber: string) {
  return `Legal_Metrology_Certificate_${certificateNumber}.pdf`;
}
