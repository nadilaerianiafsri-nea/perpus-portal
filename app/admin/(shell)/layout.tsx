import AdminShell from "@/admin/AdminShell";
import { getCurrentUser } from "@/auth/serverAuth";

/** Auth remains enforced by the parent layout; only matched content mounts the shell. */
export default async function AdminContentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>;
}
