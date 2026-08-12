import { notFound } from "next/navigation";
import { adminSections, mayOpenSection } from "@/lib/admin-permissions";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function AdminPlaceholder({ params }: { params: Promise<{ section: string }> }) {
  const staff = await requireStaff();
  const { section: slug } = await params;
  const section = adminSections.find((item) => item.slug === slug && item.slug !== "dashboard");
  if (!section || !mayOpenSection(staff.role, slug)) notFound();
  return <>
    <header className="stage-admin__page-head"><div><p>Stage 1 · Protected placeholder</p><h1>{section.label}</h1></div></header>
    <section className="stage-admin__coming"><span>Coming in the next stage</span><h2>{section.label} is not active yet.</h2><p>The route and permission boundary are in place. No {section.label.toLowerCase()} operations are implemented in Stage 1.</p><a href="/admin">Return to dashboard</a></section>
  </>;
}
