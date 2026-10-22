import { notFound } from "next/navigation";

// Match only otherwise unknown admin paths so the existing protected layout stays mounted.
export default function UnknownAdminPage() {
  notFound();
}
