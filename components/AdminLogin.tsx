"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      router.replace(result.redirectTo || "/admin");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof TypeError ? "Unable to reach Bazm. Make sure the website server is running, then try again." : reason instanceof Error ? reason.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return <form onSubmit={submit} noValidate><label className="field"><span>Email</span><input required type="email" name="email" autoComplete="username" inputMode="email" /></label><label className="field"><span>Password</span><input required type="password" name="password" autoComplete="current-password" /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button button--terra" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button></form>;
}
