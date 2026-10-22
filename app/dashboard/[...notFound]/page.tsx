import { notFound } from "next/navigation";

// Matched member pages use (shell); unknown paths render the standalone area boundary.
export default function UnknownMemberPage() {
  notFound();
}
