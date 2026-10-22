import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/serverAuth";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !user.emailVerified) redirect("/login");
  if (user.role !== "PENGUNJUNG") redirect("/admin");
  return children;
}
