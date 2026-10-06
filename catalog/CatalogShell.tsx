import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import { getCurrentUser } from "@/auth/serverAuth";
import styles from "./Catalog.module.css";
export default async function CatalogShell({
  children,
  ebook = false,
  active,
}: {
  children: React.ReactNode;
  ebook?: boolean;
  active?: "koleksi" | "ebook" | "hibah" | "tentang" | "panduan" | "faq" | "kontak";
}) {
  const user = await getCurrentUser();
  return (
    <div className={styles.shell}>
      <LandingNavbar
        active={active ?? (ebook ? "ebook" : "koleksi")}
        user={user}
      />
      {children}
      <LandingFooter catalog />
    </div>
  );
}
