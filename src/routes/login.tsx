import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { login, registerCitizen, resetDemoData } from "@/lib/store";
import { useSession } from "@/lib/useAuth";
import { Button, Field, inputClass } from "@/components/ui-kit";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Legal Metrology Verification System" },
      { name: "description", content: "Sign in or register for the Legal Metrology Verification System." },
    ],
  }),
  component: LoginPage,
});

const DEMOS = [
  { email: "citizen@demo.com", label: "Citizen — Anita Deshmukh" },
  { email: "admin@demo.com", label: "Admin — Rajesh Menon" },
  { email: "officer@demo.com", label: "Officer (LMO) — Sunil Kulkarni" },
  { email: "officer2@demo.com", label: "Officer (GATC) — Priya Nair" },
];

function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("citizen@demo.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", password: "", confirm: "" });
  const navigate = useNavigate();
  const { user } = useSession();

  useEffect(() => {
    if (user) navigate({ to: `/${user.role.toLowerCase()}` as "/citizen", replace: true });
  }, [user, navigate]);

  function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = login(email, password);
    if (!res.ok) setError(res.error ?? "Login failed.");
  }

  function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    const res = registerCitizen({
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      password: form.password,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage("Account created. Opening your Citizen Portal…");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Government of India · Department of Legal Metrology
        </p>
        <h1 className="mt-1 text-xl font-bold text-foreground">Legal Metrology Verification System</h1>
        <div className="mt-5 grid grid-cols-2 rounded-md border border-border p-1">
          <button className={`rounded px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => { setMode("login"); setError(""); setMessage(""); }}>Sign in</button>
          <button className={`rounded px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => { setMode("register"); setError(""); setMessage(""); }}>Register</button>
        </div>

        {mode === "login" ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">Demo accounts use password <span className="font-semibold">demo123</span>.</p>
            <form onSubmit={submitLogin} className="mt-4 space-y-3">
              <Field label="Email"><input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Password"><input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo accounts</p>
              {DEMOS.map((d) => (
                <button key={d.email} onClick={() => { setEmail(d.email); setPassword("demo123"); setError(""); }} className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted">
                  <span className="font-semibold">{d.email}</span>
                  <span className="block text-xs text-muted-foreground">{d.label}</span>
                </button>
              ))}
              <button onClick={resetDemoData} className="text-xs font-semibold text-muted-foreground underline">Reset demo data</button>
            </div>
          </>
        ) : (
          <form onSubmit={submitRegister} className="mt-5 space-y-3">
            <p className="text-sm text-muted-foreground">Public registration creates a Citizen account. Officer and Admin accounts are managed internally.</p>
            <Field label="Full name"><input required className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Email"><input required className={inputClass} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
            <Field label="Phone"><input required className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
            <Field label="Address"><textarea required className={`${inputClass} min-h-16`} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field>
            <Field label="Password"><input required minLength={6} className={inputClass} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></Field>
            <Field label="Confirm password"><input required minLength={6} className={inputClass} type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} /></Field>
            {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
            {message && <p className="text-sm font-semibold text-success">{message}</p>}
            <Button type="submit" className="w-full">Create Citizen Account</Button>
          </form>
        )}
      </div>
    </div>
  );
}
