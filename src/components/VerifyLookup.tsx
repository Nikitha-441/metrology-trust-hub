import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, Field, inputClass } from "@/components/ui-kit";

export function VerifyLookup({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        navigate({ to: "/verify/$certificateNumber", params: { certificateNumber: q } });
      }}
    >
      <div className="min-w-[240px] flex-1">
        <Field label="Enter Certificate Number">
          <input
            className={inputClass}
            placeholder="LM-2026-0002"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit">VERIFY CERTIFICATE</Button>
    </form>
  );
}

export function PublicVerifyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar px-4 py-4 text-sidebar-foreground">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
            Legal Metrology Department
          </p>
          <h1 className="text-lg font-bold">Public Certificate Verification</h1>
          <p className="text-xs text-sidebar-foreground/70">
            No login required · Prototype system
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">{children}</main>
    </div>
  );
}
