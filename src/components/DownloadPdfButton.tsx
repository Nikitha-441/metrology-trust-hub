import { useState } from "react";
import { Button } from "@/components/ui-kit";
import { buildCertificateView } from "@/lib/certificate";
import { downloadCertificatePdf } from "@/lib/certificate-pdf";
import type { AppState } from "@/lib/types";

export function DownloadPdfButton({
  certificateNumber,
  state,
  label = "DOWNLOAD PDF",
}: {
  certificateNumber: string;
  state: AppState;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        const view = buildCertificateView(certificateNumber, state);
        if (!view) return;
        setBusy(true);
        try {
          await downloadCertificatePdf(view);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "PREPARING…" : label}
    </Button>
  );
}
