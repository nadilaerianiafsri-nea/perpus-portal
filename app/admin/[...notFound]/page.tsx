import { notFound } from "next/navigation";

// Unknown paths keep the parent auth guard, outside the valid-content shell group.
export default function UnknownAdminPage() {
  notFound();
}
