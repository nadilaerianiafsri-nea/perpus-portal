import { redirect } from "next/navigation";

import Login from "@/auth/Login";
import { getCurrentUser } from "@/auth/serverAuth";
import { loginReturn } from "@/auth/loginReturn";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const user = await getCurrentUser();

  if (user) {
    redirect(
      user.role === "ADMIN"
        ? "/admin"
        : loginReturn((await searchParams).next),
    );
  }

  return <Login />;
}
