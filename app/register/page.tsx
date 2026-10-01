import { redirect } from "next/navigation";

import Register from "@/auth/Register";
import { getCurrentUser } from "@/auth/serverAuth";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(
      user.role === "ADMIN"
        ? "/admin"
        : "/pengunjung",
    );
  }

  return <Register />;
}