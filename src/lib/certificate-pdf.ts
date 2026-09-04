import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { certificateFileName, officerDesignation, type CertificateView } from "./certificate";

export async function qrDataUrl(text: string) {
  return QRCode.toDataURL(text, { margin: 1, width: 320, errorCorrectionLevel: "M" });
}

/** Generates and downloads a real PDF certificate. */
export async function downloadCertificatePdf(view: CertificateView) {
  const { certificate: cert, status, application, instrument, owner, officer, inspection } = view;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;

  /* border */
  doc.setLineWidth(2);
  doc.rect(M / 2, M / 2, W - M, H - M);
  doc.setLineWidth(0.5);
  doc.rect(M / 2 + 6, M / 2 + 6, W - M - 12, H - M - 12);

  let y = 70;
  const center = (text: string, size: number, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.text(text, W / 2, y, { align: "center" });
    y += size + 8;
  };

  center("LEGAL METROLOGY DEPARTMENT", 15, "bold");
  center("VERIFICATION CERTIFICATE", 20, "bold");
  center("Prototype document — not an official government certificate", 8);

  y += 6;
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Certificate No: ${cert.certificateNumber}`, M, y);
  doc.text(`Application ID: ${application?.id ?? "—"}`, W - M, y, { align: "right" });
  y += 22;

  const section = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, M, y);
    y += 6;
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 16;
  };

  const rows = (pairs: [string, string][]) => {
    doc.setFontSize(10);
    const colW = (W - 2 * M) / 2;
    pairs.forEach(([label, value], i) => {
      const x = M + (i % 2) * colW;
      if (i % 2 === 0 && i > 0) y += 18;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(110);
      doc.text(label, x, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(String(value || "—").slice(0, 46), x + 120, y);
    });
    y += 26;
    doc.setTextColor(0);
  };

  section("OWNER / APPLICANT DETAILS");
  rows([
    ["Name", owner?.name ?? "—"],
    ["Email", owner?.email ?? "—"],
    ["Organization", owner?.organization ?? "—"],
    ["Address", owner?.address ?? instrument?.location ?? "—"],
  ]);

  section("INSTRUMENT DETAILS");
  rows([
    ["Instrument Type", instrument?.type ?? "—"],
    ["Make", instrument?.make ?? "—"],
    ["Model", instrument?.model ?? "—"],
    ["Serial Number", instrument?.serialNumber ?? "—"],
    ["Capacity", instrument ? `${instrument.capacity} ${instrument.unit}` : "—"],
    ["Location", instrument?.location ?? "—"],
  ]);

  section("VERIFICATION DETAILS");
  rows([
    ["Verification Type", application?.verificationType ?? "—"],
    ["Inspection Date", inspection?.inspectedAt?.slice(0, 10) ?? "—"],
    ["Officer", officer?.name ?? "—"],
    ["Designation", officerDesignation(officer)],
    ["Result", inspection?.result === "FAIL" ? "FAILED" : "PASSED"],
  ]);

  section("VALIDITY");
  rows([
    ["Date of Issue", cert.issueDate],
    ["Valid Until", cert.validUntil],
    ["Validity Period", cert.validityMonths ? `${cert.validityMonths} months` : "—"],
    ["Certificate Status", status],
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  if (status === "EXPIRED") {
    doc.setTextColor(180, 30, 30);
    doc.text("THIS CERTIFICATE HAS EXPIRED", M, y);
    y += 18;
    doc.setFontSize(10);
    doc.text(`Verification / re-verification is required. Expired on ${cert.validUntil}.`, M, y);
  } else if (status === "REVOKED") {
    doc.setTextColor(180, 30, 30);
    doc.text("THIS CERTIFICATE HAS BEEN REVOKED", M, y);
  } else {
    doc.text(`This certificate is valid until ${cert.validUntil}.`, M, y);
    if (status === "EXPIRING SOON") {
      y += 18;
      doc.setTextColor(170, 100, 0);
      doc.setFontSize(10);
      doc.text("EXPIRING SOON — schedule re-verification before the expiry date.", M, y);
    }
  }
  doc.setTextColor(0);

  /* QR + signature block */
  const blockY = H - 190;
  try {
    const dataUrl = await qrDataUrl(view.verificationUrl);
    doc.addImage(dataUrl, "PNG", M, blockY, 96, 96);
  } catch {
    /* QR generation failure must not block the download */
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Scan to verify online", M, blockY + 110);
  doc.text(view.verificationUrl.slice(0, 60), M, blockY + 122);

  doc.setLineWidth(0.5);
  doc.line(W - M - 200, blockY + 70, W - M, blockY + 70);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(officer?.name ?? "Verifying Officer", W - M, blockY + 86, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(officerDesignation(officer), W - M, blockY + 100, { align: "right" });
  doc.text("Signature / Designation", W - M, blockY + 114, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Verify this certificate at ${view.verificationUrl}`,
    W / 2,
    H - 44,
    { align: "center" },
  );

  doc.save(certificateFileName(cert.certificateNumber));
}
