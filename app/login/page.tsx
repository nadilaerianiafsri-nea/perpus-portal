import { redirect } from "next/navigation";

import Login from "@/auth/Login";
import { getCurrentUser } from "@/auth/serverAuth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(
      user.role === "ADMIN"
        ? "/admin"
        : "/pengunjung",
    );
  }

  return <Login />;
}