import { getDashboardSummary } from "@/lib/database";

export const metadata = { title: "Dashboard · Bazm admin", robots: { index: false } };
export const dynamic = "force-dynamic";
const cards = [
  ["upcomingEvents", "Upcoming events", "Events scheduled from today onward"],
  ["draftEvents", "Draft events", "Not yet published"],
  ["publishedEvents", "Published events", "Visible programme records"],
  ["ticketsSold", "Tickets sold", "Issued ticket records"],
  ["paymentProofsAwaitingReview", "Payment proofs awaiting review", "Submitted or under review"],
  ["todaysCheckIns", "Today’s check-ins", "Active check-ins in PKT"],
] as const;

export default async function AdminDashboard() {
  const summary = await getDashboardSummary();
  return <>
    <header className="stage-admin__page-head"><div><p>Stage 1 · Foundation</p><h1>Dashboard</h1></div><span>Live database summary</span></header>
    <section className="stage-admin__cards" aria-label="Dashboard summary">{cards.map(([key, label, note]) => <article key={key}><span>{label}</span><strong>{summary[key].toLocaleString("en-PK")}</strong><small>{note}</small></article>)}</section>
    <section className="stage-admin__welcome"><p>Admin foundation</p><h2>Secure access is ready.</h2><p>This stage establishes staff authentication, database-backed reporting totals, role-aware navigation and protected route boundaries. Operational tools will arrive in later stages.</p></section>
  </>;
}
