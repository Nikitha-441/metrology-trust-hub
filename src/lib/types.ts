export type Role = "CITIZEN" | "ADMIN" | "OFFICER";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  officerType?: "LMO" | "GATC";
  /* profile fields */
  phone?: string;
  organization?: string;
  address?: string;
  password?: string;
  officerId?: string;
  designation?: string;
  department?: string;
};

export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type Instrument = {
  id: string;
  ownerId: string;
  type: string;
  make: string;
  model: string;
  serialNumber: string;
  capacity: string;
  unit: string;
  location: string;
  verificationStatus: VerificationStatus;
  validUntil: string | null;
  highRiskCategory?: boolean;
  previousFailure?: boolean;
  overdue?: boolean;
  complianceIssue?: boolean;
};

export type AppStatus =
  | "SUBMITTED"
  | "ASSIGNED"
  | "SCHEDULED"
  | "INSPECTION"
  | "CORRECTION_REQUIRED"
  | "REINSPECTION_REQUESTED"
  | "CERTIFIED"
  | "FAILED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type UploadedFile = {
  name: string;
  type: string;
  size: number;
  dataUrl: string | null;
};

export type Schedule = {
  date: string;
  time: string;
  location: string;
};

export type FailureReason =
  | "Accuracy outside permissible limit"
  | "Repeatability outside permissible limit"
  | "Eccentric loading outside permissible limit"
  | "Damaged seal"
  | "Incorrect marking"
  | "Physical damage"
  | "Other";

export type Application = {
  id: string;
  instrumentId: string;
  applicantId: string;
  assignedOfficerId: string | null;
  verificationType: "INITIAL VERIFICATION" | "RE-VERIFICATION";
  status: AppStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: string[];
  createdAt: string;
  schedule?: Schedule | null;
  instrumentPhoto?: UploadedFile | null;
  supportingDocument?: UploadedFile | null;
  failureReasons?: FailureReason[];
  correctiveAction?: string;
  officerRemarks?: string;
  previousApplicationId?: string | null;
  reinspectionRequestedAt?: string | null;
};

export type Inspection = {
  applicationId: string;
  result: "PASS" | "FAIL";
  visualChecks?: Record<string, "PASS" | "FAIL" | boolean>;
  repeatabilityReadings?: string[];
  repeatabilityResult?: "PASS" | "FAIL";
  accuracyTests?: { testPoint: string; reading: string }[];
  eccentricLoadingChecks?: Record<string, "PASS" | "FAIL" | boolean>;
  failureReasons?: FailureReason[];
  correctiveAction?: string;
  zeroError: string;
  standardReading1: string;
  standardReading2: string;
  displayCondition?: string;
  sealCondition?: string;
  observation?: string;
  remarks: string;
  evidence: string | null;
  inspectionPhoto?: UploadedFile | null;
  evidencePhoto?: UploadedFile | null;
  inspectedAt: string;
};

export type Certificate = {
  id: string;
  applicationId: string;
  certificateNumber: string;
  issueDate: string;
  validUntil: string;
  /** stored lifecycle flag only; display status is derived (see certificateStatus) */
  status: "ACTIVE" | "REVOKED";
  validityMonths?: number;
  qrToken: string;
};

/** derived, never stored */
export type CertificateStatus = "ACTIVE" | "EXPIRING SOON" | "EXPIRED" | "REVOKED";

export type Notification = {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type AppState = {
  users: User[];
  instruments: Instrument[];
  applications: Application[];
  inspections: Inspection[];
  certificates: Certificate[];
  notifications: Notification[];
  currentUserId: string | null;
};
