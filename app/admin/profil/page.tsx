import { redirect } from "next/navigation";
import AdminProfilePage from "@/admin/AdminProfilePage";
import { getCurrentUser } from "@/auth/serverAuth";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <AdminProfilePage user={{ name: user.name, email: user.email }} />;
}
