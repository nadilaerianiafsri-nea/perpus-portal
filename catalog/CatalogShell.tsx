import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import { getCurrentUser } from "@/auth/serverAuth";
import styles from "./Catalog.module.css";
import revision from "./PublicShellRevision.module.css";

type PublicActive =
  | "koleksi"
  | "ebook"
  | "hibah"
  | "tentang"
  | "panduan"
  | "faq"
  | "kontak";

export default async function CatalogShell({
  children,
  active,
}: {
  children: React.ReactNode;
  ebook?: boolean;
  active?: PublicActive;
}) {
  const user = await getCurrentUser();
  const normalizedActive = active === "ebook" ? "koleksi" : (active ?? "koleksi");

  return (
    <div className={`${styles.shell} ${revision.publicShell}`}>
      <LandingNavbar active={normalizedActive} user={user} />
      {children}
      <LandingFooter catalog />
    </div>
  );
}
