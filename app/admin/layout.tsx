import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/serverAuth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/pengunjung");
  }

  return children;
}