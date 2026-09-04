import type { FailureReason } from "./types";

/**
 * Demo inspection criteria used by the prototype.
 * These are platform evaluation thresholds, not statutory limits.
 * Keep the calculation centralized so the UI never hard-codes PASS/FAIL.
 */
export const INSPECTION_CRITERIA = {
  repeatabilityMaxRange: 0.02,
  accuracyMaxAbsDeviation: 0.05,
} as const;

const NUMBER_RE = /-?\d+(?:\.\d+)?/;

export function parseReading(value: string) {
  const match = value.match(NUMBER_RE);
  return match ? Number(match[0]) : Number.NaN;
}

function passFail(value: string) {
  return value === "PASS" || value === "FAIL" ? value : "";
}

export function evaluateInspection({
  visualChecks,
  repeatabilityReadings,
  accuracyTests,
  eccentricLoadingChecks,
}: {
  visualChecks: Record<string, "PASS" | "FAIL" | "">;
  repeatabilityReadings: string[];
  accuracyTests: { testPoint: string; reading: string }[];
  eccentricLoadingChecks: Record<string, "PASS" | "FAIL" | "">;
}) {
  const visualEntries = Object.values(visualChecks).map(passFail);
  const visualComplete = visualEntries.length > 0 && visualEntries.every(Boolean);
  const visualPass = visualComplete && visualEntries.every((value) => value === "PASS");

  const repeatabilityValues = repeatabilityReadings.map(parseReading);
  const repeatabilityComplete = repeatabilityValues.length === 3 && repeatabilityValues.every(Number.isFinite);
  const repeatabilityRange = repeatabilityComplete
    ? Math.max(...repeatabilityValues) - Math.min(...repeatabilityValues)
    : Number.NaN;
  const repeatabilityPass = repeatabilityComplete && repeatabilityRange <= INSPECTION_CRITERIA.repeatabilityMaxRange;

  const accuracyValues = accuracyTests.map((item) => {
    const reference = parseReading(item.testPoint);
    const observed = parseReading(item.reading);
    return { reference, observed, deviation: observed - reference };
  });
  const accuracyComplete = accuracyValues.length > 0 && accuracyValues.every(
    ({ reference, observed }) => Number.isFinite(reference) && Number.isFinite(observed),
  );
  const accuracyPass = accuracyComplete && accuracyValues.every(
    ({ deviation }) => Math.abs(deviation) <= INSPECTION_CRITERIA.accuracyMaxAbsDeviation,
  );

  const eccentricEntries = Object.values(eccentricLoadingChecks).map(passFail);
  const eccentricComplete = eccentricEntries.length > 0 && eccentricEntries.every(Boolean);
  const eccentricPass = eccentricComplete && eccentricEntries.every((value) => value === "PASS");

  const overallPass = visualPass && repeatabilityPass && accuracyPass && eccentricPass;

  const reasons = new Set<FailureReason>();
  Object.entries(visualChecks).forEach(([label, value]) => {
    if (value !== "FAIL") return;
    if (label === "Seal / tampering check") reasons.add("Damaged seal");
    else if (label === "Physical integrity") reasons.add("Physical damage");
    else reasons.add("Incorrect marking");
  });
  if (!repeatabilityPass && repeatabilityComplete) reasons.add("Repeatability outside permissible limit");
  if (!accuracyPass && accuracyComplete) reasons.add("Accuracy outside permissible limit");
  if (!eccentricPass && eccentricComplete) reasons.add("Eccentric loading outside permissible limit");

  return {
    visualComplete,
    visualPass,
    repeatabilityComplete,
    repeatabilityRange,
    repeatabilityPass,
    accuracyComplete,
    accuracyPass,
    accuracyValues,
    eccentricComplete,
    eccentricPass,
    overallComplete: visualComplete && repeatabilityComplete && accuracyComplete && eccentricComplete,
    overallPass,
    result: overallPass ? ("PASS" as const) : ("FAIL" as const),
    failureReasons: [...reasons],
  };
}
