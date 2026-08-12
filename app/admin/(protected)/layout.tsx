import AdminShell from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
