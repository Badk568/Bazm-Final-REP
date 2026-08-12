import { redirect } from "next/navigation";
import Mark from "@/components/Mark";
import AdminLogin from "@/components/AdminLogin";
import { getCurrentStaff } from "@/lib/auth";

export const metadata = { title: "Staff sign in · Bazm", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function AdminLoginPage() {
  if (await getCurrentStaff()) redirect("/admin");
  return <main className="login plaster"><div><Mark size={54} /><p className="kicker">Bazm staff</p><h1>Welcome back.</h1><p>Sign in to the protected administration workspace.</p><AdminLogin /><small>Access is restricted to active staff accounts. Login activity is rate limited and sessions can be revoked.</small><a href="/">← Return to Bazm</a></div></main>;
}
