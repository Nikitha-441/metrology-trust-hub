import type { AppState, Application, Certificate, Instrument, User } from "./types";
import { computeRisk } from "./risk";

const users: User[] = [
  { id: "u-admin", name: "Rajesh Menon", email: "admin@demo.com", role: "ADMIN" },
  { id: "u-off1", name: "Sunil Kulkarni", email: "officer@demo.com", role: "OFFICER", officerType: "LMO" },
  { id: "u-off2", name: "Priya Nair", email: "officer2@demo.com", role: "OFFICER", officerType: "GATC" },
  { id: "u-cit1", name: "Anita Deshmukh", email: "citizen@demo.com", role: "CITIZEN" },
  { id: "u-cit2", name: "Vikram Iyer", email: "citizen2@demo.com", role: "CITIZEN" },
  { id: "u-cit3", name: "Farhan Qureshi", email: "citizen3@demo.com", role: "CITIZEN" },
];

const instruments: Instrument[] = [
  {
    id: "i-1", ownerId: "u-cit1", type: "Fuel Dispenser", make: "Gilbarco", model: "Encore 300",
    serialNumber: "GB-DSP-88213", capacity: "80", unit: "L/min", location: "Shivaji Nagar, Pune, MH",
    verificationStatus: "PENDING", validUntil: "2026-02-01", highRiskCategory: true, previousFailure: true, overdue: true,
  },
  {
    id: "i-2", ownerId: "u-cit1", type: "Electronic Weighing Scale", make: "Essae", model: "DS-215",
    serialNumber: "ES-WS-40192", capacity: "30", unit: "kg", location: "Camp Market, Pune, MH",
    verificationStatus: "VERIFIED", validUntil: "2027-03-15",
  },
  {
    id: "i-3", ownerId: "u-cit2", type: "Weighbridge", make: "Avery India", model: "WB-60T",
    serialNumber: "AV-WB-77341", capacity: "60", unit: "tonne", location: "Bhiwandi Logistics Park, MH",
    verificationStatus: "PENDING", validUntil: "2026-05-20", highRiskCategory: true, complianceIssue: true,
  },
  {
    id: "i-4", ownerId: "u-cit2", type: "Counter Scale", make: "Goldtech", model: "GT-10",
    serialNumber: "GT-CS-10022", capacity: "10", unit: "kg", location: "MG Road, Bengaluru, KA",
    verificationStatus: "UNVERIFIED", validUntil: null,
  },
  {
    id: "i-5", ownerId: "u-cit3", type: "Petrol Pump Flow Meter", make: "Tokheim", model: "Quantium 510",
    serialNumber: "TK-FM-55210", capacity: "50", unit: "L/min", location: "Ameerpet, Hyderabad, TS",
    verificationStatus: "REJECTED", validUntil: "2026-01-10", previousFailure: true, overdue: true,
  },
  {
    id: "i-6", ownerId: "u-cit3", type: "Beam Scale", make: "Kanta Works", model: "BS-100",
    serialNumber: "KW-BS-30188", capacity: "100", unit: "kg", location: "Sadar Bazar, Nagpur, MH",
    verificationStatus: "VERIFIED", validUntil: "2026-10-05",
  },
];

function byId(id: string) {
  return instruments.find((i) => i.id === id)!;
}

function mkApp(
  id: string,
  instrumentId: string,
  applicantId: string,
  verificationType: Application["verificationType"],
  status: Application["status"],
  assignedOfficerId: string | null,
  createdAt: string,
): Application {
  return { id, instrumentId, applicantId, assignedOfficerId, verificationType, status, createdAt, ...computeRisk(byId(instrumentId)) };
}

const applications: Application[] = [
  mkApp("LM-APP-1000", "i-1", "u-cit1", "INITIAL VERIFICATION", "CERTIFIED", "u-off1", "2025-01-20T09:00:00.000Z"),
  mkApp("LM-APP-1001", "i-1", "u-cit1", "RE-VERIFICATION", "SUBMITTED", null, "2026-08-02T09:10:00.000Z"),
  mkApp("LM-APP-1002", "i-3", "u-cit2", "INITIAL VERIFICATION", "ASSIGNED", "u-off1", "2026-08-05T11:20:00.000Z"),
  mkApp("LM-APP-1003", "i-5", "u-cit3", "RE-VERIFICATION", "CORRECTION_REQUIRED", "u-off2", "2026-07-18T08:00:00.000Z"),
  mkApp("LM-APP-1004", "i-2", "u-cit1", "RE-VERIFICATION", "CERTIFIED", "u-off1", "2026-06-11T10:30:00.000Z"),
  mkApp("LM-APP-1005", "i-4", "u-cit2", "INITIAL VERIFICATION", "SUBMITTED", null, "2026-08-20T13:45:00.000Z"),
  mkApp("LM-APP-1006", "i-6", "u-cit3", "RE-VERIFICATION", "ASSIGNED", "u-off2", "2026-08-22T15:05:00.000Z"),
];

const certificates: Certificate[] = [
  {
    id: "c-0", applicationId: "LM-APP-1000", certificateNumber: "LM-2025-0001",
    issueDate: "2025-02-01", validUntil: "2026-02-01", validityMonths: 12,
    status: "ACTIVE", qrToken: "qr-seed-lm20250001",
  },
  {
    id: "c-1", applicationId: "LM-APP-1004", certificateNumber: "LM-2026-0001",
    issueDate: "2026-06-15", validUntil: "2027-03-15", validityMonths: 9, status: "ACTIVE", qrToken: "qr-seed-lm20260001",
  },
];

export function seedState(): AppState {
  return {
    users,
    instruments,
    applications,
    inspections: [
      {
        applicationId: "LM-APP-1000", result: "PASS", zeroError: "0.00", standardReading1: "5.00",
        standardReading2: "10.00", remarks: "Initial verification within tolerance.", evidence: null,
        inspectedAt: "2025-02-01T10:00:00.000Z",
      },
      {
        applicationId: "LM-APP-1003", result: "FAIL", zeroError: "0.35", standardReading1: "4.82",
        standardReading2: "9.55", remarks: "Flow meter under-delivering beyond permissible error.",
        evidence: null, inspectedAt: "2026-07-22T10:00:00.000Z",
        failureReasons: ["Accuracy outside permissible limit"],
        correctiveAction: "Recalibrate the flow meter and request reinspection.",
      },
      {
        applicationId: "LM-APP-1004", result: "PASS", zeroError: "0.00", standardReading1: "5.00",
        standardReading2: "10.00", remarks: "Within tolerance.", evidence: null,
        inspectedAt: "2026-06-15T10:00:00.000Z",
      },
    ],
    certificates,
    notifications: [],
    currentUserId: null,
  };
}
