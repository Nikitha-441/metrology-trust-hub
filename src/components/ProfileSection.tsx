import { useState } from "react";
import { Button, Card, Field, SectionTitle, inputClass } from "@/components/ui-kit";
import { updateProfile } from "@/lib/store";
import type { User } from "@/lib/types";

const FIELDS: Record<User["role"], { key: keyof User; label: string }[]> = {
  CITIZEN: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "organization", label: "Organization / Business" },
    { key: "address", label: "Address" },
  ],
  OFFICER: [
    { key: "name", label: "Name" },
    { key: "officerId", label: "Officer ID" },
    { key: "designation", label: "Designation" },
    { key: "department", label: "Department" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ],
  ADMIN: [
    { key: "name", label: "Name" },
    { key: "department", label: "Department" },
    { key: "email", label: "Email" },
  ],
};

export function ProfileSection({ user }: { user: User }) {
  const fields = FIELDS[user.role];
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, (user[f.key] as string) ?? ""])),
  );
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <SectionTitle>My Profile</SectionTitle>
      {saved && (
        <div className="mb-4 rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          Profile saved.
        </div>
      )}
      <Card>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile(user.id, form as Partial<User>);
            setSaved(true);
          }}
        >
          {fields.map((f) => (
            <div key={String(f.key)} className={f.key === "address" ? "sm:col-span-2" : ""}>
              <Field label={f.label}>
                <input
                  className={inputClass}
                  value={form[f.key as string] ?? ""}
                  onChange={(e) => {
                    setSaved(false);
                    setForm((s) => ({ ...s, [f.key as string]: e.target.value }));
                  }}
                />
              </Field>
            </div>
          ))}
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit">SAVE PROFILE</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
