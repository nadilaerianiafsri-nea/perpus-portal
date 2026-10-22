import MemberShell from "@/members/MemberShell";
import { getCurrentUser } from "@/auth/serverAuth";

/** Keep the existing parent auth guard outside both matched content and route 404. */
export default async function MemberContentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <MemberShell user={user}>{children}</MemberShell>;
}
