import type { Instrument, RiskLevel } from "./types";

const HIGH_RISK_TYPES = ["Fuel Dispenser", "Weighbridge", "Bulk Flow Meter", "Tank Lorry Calibration"];

export function levelFor(score: number): RiskLevel {
  if (score <= 30) return "LOW";
  if (score <= 60) return "MEDIUM";
  return "HIGH";
}

export function computeRisk(instrument: Instrument) {
  let score = 0;
  const reasons: string[] = [];

  if (instrument.highRiskCategory || HIGH_RISK_TYPES.includes(instrument.type)) {
    score += 40;
    reasons.push("High-risk instrument category");
  }
  if (instrument.previousFailure) {
    score += 30;
    reasons.push("Previous failed verification");
  }
  const overdue =
    instrument.overdue ||
    (instrument.validUntil ? new Date(instrument.validUntil) < new Date() : false);
  if (overdue) {
    score += 20;
    reasons.push("Verification overdue");
  }
  if (instrument.complianceIssue) {
    score += 10;
    reasons.push("Other compliance issue");
  }
  if (!instrument.validUntil && instrument.verificationStatus !== "VERIFIED") {
    score += 10;
    reasons.push("No current verification certificate");
  }
  if (reasons.length === 0) reasons.push("No additional risk indicators found");

  score = Math.min(100, score);
  return { riskScore: score, riskLevel: levelFor(score), riskReasons: reasons };
}
