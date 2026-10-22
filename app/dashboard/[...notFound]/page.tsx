import { notFound } from "next/navigation";

// Existing static/dynamic member pages take precedence over this fallback.
export default function UnknownMemberPage() {
  notFound();
}
