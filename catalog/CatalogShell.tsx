import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import { getCurrentUser } from "@/auth/serverAuth";
import styles from "./Catalog.module.css";
export default async function CatalogShell({
  children,
  ebook = false,
}: {
  children: React.ReactNode;
  ebook?: boolean;
}) {
  const user = await getCurrentUser();
  return (
    <div className={styles.shell}>
      <LandingNavbar active={ebook ? "ebook" : "koleksi"} user={user} />
      {children}
      <LandingFooter catalog />
    </div>
  );
}
