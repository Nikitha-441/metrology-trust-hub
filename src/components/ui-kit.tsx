import { useState, type ReactNode } from "react";
import type { AppStatus, CertificateStatus, RiskLevel } from "@/lib/types";
import { markNotificationsRead, useAppState } from "@/lib/store";

export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  const map: Record<CertificateStatus, string> = {
    ACTIVE: "bg-success/15 text-success",
    "EXPIRING SOON": "bg-warning/25 text-warning-foreground",
    EXPIRED: "bg-destructive/15 text-destructive",
    REVOKED: "bg-secondary text-secondary-foreground",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${map[status]}`}>
      {status}
    </span>
  );
}

export function NotificationBell({ userId }: { userId: string }) {
  const state = useAppState();
  const [open, setOpen] = useState(false);
  const items = state.notifications
    .filter((n) => n.userId === userId)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${unread} unread)`}
        className="relative rounded-md border border-sidebar-border px-3 py-1.5 font-semibold hover:bg-sidebar-accent"
      >
        Alerts
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 inline-flex min-w-5 justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border bg-card text-foreground shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wide">Notifications</span>
            <button
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-40"
              disabled={unread === 0}
              onClick={() => markNotificationsRead(userId)}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications.</li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={`border-b border-border px-3 py-2 text-sm last:border-b-0 ${
                  n.read ? "text-muted-foreground" : "bg-muted/40 font-medium"
                }`}
              >
                {n.message}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("en-GB")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-3xl font-bold text-foreground">{value}</span>
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{children}</h2>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "success" | "danger" | "ghost";
}) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border bg-card text-foreground hover:bg-muted",
    success: "bg-success text-success-foreground hover:opacity-90",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    ghost: "text-foreground hover:bg-muted",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const map: Record<RiskLevel, string> = {
    LOW: "bg-success/15 text-success",
    MEDIUM: "bg-warning/25 text-warning-foreground",
    HIGH: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${map[level]}`}>
      {score !== undefined ? `${score}/100 · ` : ""}
      {level} RISK
    </span>
  );
}

export function StatusBadge({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, string> = {
    SUBMITTED: "bg-secondary text-secondary-foreground",
    ASSIGNED: "bg-accent/15 text-accent",
    SCHEDULED: "bg-primary/15 text-primary",
    INSPECTION: "bg-warning/25 text-warning-foreground",
    CERTIFIED: "bg-success/15 text-success",
    FAILED: "bg-destructive/15 text-destructive",
    CORRECTION_REQUIRED: "bg-destructive/15 text-destructive",
    REINSPECTION_REQUESTED: "bg-accent/15 text-accent",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${map[status]}`}>
      {status}
    </span>
  );
}

const TIMELINE = ["SUBMITTED", "RISK ASSESSED", "ASSIGNED", "SCHEDULED", "INSPECTION", "CERTIFIED"] as const;

const REACHED: Record<AppStatus, number> = {
  SUBMITTED: 1,
  ASSIGNED: 2,
  SCHEDULED: 3,
  INSPECTION: 4,
  CERTIFIED: 5,
  FAILED: 4,
  CORRECTION_REQUIRED: 4,
  REINSPECTION_REQUESTED: 1,
};

export function StatusTimeline({ status }: { status: AppStatus }) {
  const failed = status === "FAILED" || status === "CORRECTION_REQUIRED";
  const steps = failed
    ? ["SUBMITTED", "RISK ASSESSED", "ASSIGNED", "SCHEDULED", "INSPECTION", status === "CORRECTION_REQUIRED" ? "CORRECTION REQUIRED" : "FAILED"]
    : status === "REINSPECTION_REQUESTED"
      ? ["SUBMITTED", "REINSPECTION REQUESTED", "ASSIGNED", "SCHEDULED", "INSPECTION", "CERTIFIED"]
      : [...TIMELINE];
  const reached = REACHED[status];
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1">
      {steps.map((s, i) => {
        const isFail = failed && i === steps.length - 1;
        const done = i < reached || (isFail && true);
        const current = !isFail && i === reached;
        const mark = isFail ? "✕" : done ? "✓" : current ? "●" : "○";
        return (
          <li
            key={s}
            className={`flex items-center gap-1 text-[11px] font-semibold ${
              isFail
                ? "text-destructive"
                : done
                  ? "text-success"
                  : current
                    ? "text-primary"
                    : "text-muted-foreground"
            }`}
          >
            <span aria-hidden>{mark}</span>
            {s}
          </li>
        );
      })}
    </ol>
  );
}

/** Plain-language "what happens next" line, derived from real state. */
export function nextActionFor(
  status: AppStatus,
  cert?: { validUntil: string } | undefined,
  certStatus?: CertificateStatus | undefined,
): string {
  switch (status) {
    case "SUBMITTED":
      return "Next: Await admin assignment";
    case "ASSIGNED":
      return "Next: Inspection needs to be scheduled";
    case "SCHEDULED":
      return "Next: Officer must conduct inspection";
    case "INSPECTION":
      return "Next: Submit inspection result";
    case "FAILED":
      return "Next: Correction required";
    case "CORRECTION_REQUIRED":
      return "Next: Correct the issue and request reinspection";
    case "REINSPECTION_REQUESTED":
      return "Next: Await admin assignment";
    case "CERTIFIED":
      if (certStatus === "EXPIRED" || certStatus === "REVOKED") return "Next: Re-verification required";
      if (certStatus === "EXPIRING SOON") return "Next: Re-verification recommended";
      return cert ? `Next: Certificate is valid until ${cert.validUntil}` : "Next: Certificate issued";
    default:
      return "";
  }
}

export function NextAction({
  status,
  cert,
  certStatus,
}: {
  status: AppStatus;
  cert?: { validUntil: string } | undefined;
  certStatus?: CertificateStatus | undefined;
}) {
  return (
    <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-foreground">
      <span className="uppercase tracking-wide text-muted-foreground">Current status: {status} · </span>
      {nextActionFor(status, cert, certStatus)}
    </p>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-foreground/50 p-0 sm:p-4">
      <div className="my-0 w-full max-w-2xl rounded-none border border-border bg-card shadow-lg sm:my-8 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
          <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}


/* ---------------- uploads & scheduling ---------------- */

export function FileUpload({
  label,
  value,
  onChange,
  accept = "image/*,.pdf",
}: {
  label: string;
  value: import("@/lib/types").UploadedFile | null;
  onChange: (f: import("@/lib/types").UploadedFile | null) => void;
  accept?: string;
}) {
  return (
    <div className="space-y-2">
      <Field label={label}>
        <input
          type="file"
          accept={accept}
          capture={accept.startsWith("image/") ? "environment" : undefined}
          className={inputClass}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return onChange(null);
            const base = { name: file.name, type: file.type, size: file.size };
            if (file.type.startsWith("image/")) {
              const reader = new FileReader();
              reader.onload = () => onChange({ ...base, dataUrl: String(reader.result) });
              reader.onerror = () => onChange({ ...base, dataUrl: null });
              reader.readAsDataURL(file);
            } else {
              onChange({ ...base, dataUrl: null });
            }
          }}
        />
      </Field>
      {value && <FilePreview file={value} />}
    </div>
  );
}

export function FilePreview({
  file,
  compact = false,
}: {
  file: import("@/lib/types").UploadedFile;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2 text-xs">
      <p className="font-semibold text-foreground">{file.name}</p>
      <p className="text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
      {file.dataUrl && (
        <img
          src={file.dataUrl}
          alt={file.name}
          className={`mt-2 rounded border border-border ${compact ? "max-h-32" : "max-h-48"}`}
        />
      )}
    </div>
  );
}

export function ScheduleCard({
  schedule,
  officerName,
}: {
  schedule: import("@/lib/types").Schedule;
  officerName?: string | undefined;
}) {
  const dateLabel = schedule.date
    ? new Date(`${schedule.date}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";
  const timeLabel = schedule.time
    ? new Date(`2000-01-01T${schedule.time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Inspection Scheduled</p>
      <dl className="mt-2 grid gap-1 sm:grid-cols-2">
        <div>Date: <span className="font-semibold">{dateLabel}</span></div>
        <div>Time: <span className="font-semibold">{timeLabel}</span></div>
        {officerName && <div>Officer: <span className="font-semibold">{officerName}</span></div>}
        <div>Location: <span className="font-semibold">{schedule.location || "—"}</span></div>
      </dl>
    </div>
  );
}
