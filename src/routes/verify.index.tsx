import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui-kit";
import { PublicVerifyShell, VerifyLookup } from "@/components/VerifyLookup";

export const Route = createFileRoute("/verify/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verify a Legal Metrology Certificate" },
      { name: "description", content: "Publicly verify a Legal Metrology verification certificate by entering its certificate number or scanning the certificate QR code." },
      { property: "og:title", content: "Verify a Legal Metrology Certificate" },
      { property: "og:description", content: "Check whether a weighing or measuring instrument certificate is active or expired." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyIndex,
});

function VerifyIndex() {
  return (
    <PublicVerifyShell>
      <Card>
        <h2 className="text-base font-bold">Verify a certificate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the QR code printed on a certificate, or enter the certificate number below.
        </p>
        <div className="mt-4">
          <VerifyLookup />
        </div>
      </Card>
    </PublicVerifyShell>
  );
}
