import { useMemo, useState } from "react";
import { Button, Card, RiskBadge, StatusBadge, inputClass } from "@/components/ui-kit";
import { certificateStatus } from "@/lib/store";
import type { AppState, Application } from "@/lib/types";

/**
 * Search / retrieval of verification records. Reads only from existing app
 * state — no separate data store.
 * Matches: application ID, instrument serial number, certificate number,
 * applicant name (when `withApplicant`).
 */
export function RecordSearch({
  state,
  applications,
  onOpen,
  label = "Search verification records",
  placeholder = "Application ID · serial · certificate number",
  withApplicant = true,
}: {
  state: AppState;
  applications: Application[];
  onOpen: (applicationId: string) => void;
  label?: string;
  placeholder?: string;
  withApplicant?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return applications.filter((a) => {
      const inst = state.instruments.find((i) => i.id === a.instrumentId);
      const applicant = state.users.find((u) => u.id === a.applicantId);
      const cert = state.certificates.find((c) => c.applicationId === a.id);
      const haystack = [
        a.id,
        inst?.serialNumber,
        inst?.type,
        cert?.certificateNumber,
        cert?.qrToken,
        withApplicant ? applicant?.name : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, applications, state, withApplicant]);

  return (
    <Card className="mb-6">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(term);
        }}
      >
        <label className="flex-1 text-sm">
          <span className="font-semibold text-foreground">{label}</span>
          <input
            className={`${inputClass} mt-1`}
            placeholder={placeholder}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit">SEARCH</Button>
          {query && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTerm("");
                setQuery("");
              }}
            >
              CLEAR
            </Button>
          )}
        </div>
      </form>

      {results && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No matching verification record found.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((a) => {
                const inst = state.instruments.find((i) => i.id === a.instrumentId);
                const applicant = state.users.find((u) => u.id === a.applicantId);
                const officer = state.users.find((u) => u.id === a.assignedOfficerId);
                const insp = state.inspections.find((i) => i.applicationId === a.id);
                const cert = state.certificates.find((c) => c.applicationId === a.id);
                return (
                  <div key={a.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">{a.id}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <RiskBadge level={a.riskLevel} score={a.riskScore} />
                        <StatusBadge status={a.status} />
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {withApplicant && (
                        <div>Applicant: <span className="text-foreground">{applicant?.name ?? "—"}</span></div>
                      )}
                      <div>Instrument: <span className="text-foreground">{inst?.type ?? "—"}</span></div>
                      <div>Serial: <span className="text-foreground">{inst?.serialNumber ?? "—"}</span></div>
                      <div>Officer: <span className="text-foreground">{officer?.name ?? "Not assigned"}</span></div>
                      <div>
                        Inspection date:{" "}
                        <span className="text-foreground">
                          {insp?.inspectedAt?.slice(0, 10) ?? a.schedule?.date ?? "—"}
                        </span>
                      </div>
                      <div>
                        Certificate:{" "}
                        <span className="text-foreground">
                          {cert
                            ? `${cert.certificateNumber} (${certificateStatus(cert)})`
                            : "—"}
                        </span>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <Button variant="outline" onClick={() => onOpen(a.id)}>
                        VIEW DETAILS
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
