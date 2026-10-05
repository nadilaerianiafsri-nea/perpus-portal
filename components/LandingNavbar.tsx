import Link from "next/link";
type NavbarProps = {
  active?: "beranda" | "koleksi" | "ebook";
  user?: { name: string; role: "ADMIN" | "PENGUNJUNG" } | null;
};
export default function LandingNavbar({
  active = "beranda",
  user,
}: NavbarProps) {
  const links = [
    ["Beranda", "/", "beranda"],
    ["Koleksi", "/koleksi", "koleksi"],
    ["E-Book", "/e-book", "ebook"],
    ["Hibah Buku", "/#layanan", "hibah"],
    ["Tentang", "/#tentang", "tentang"],
    ["Panduan", "/#panduan", "panduan"],
    ["FAQ", "/#faq", "faq"],
    ["Kontak", "/#kontak", "kontak"],
  ];
  const actions = user ? (
    <Link
      className="member-btn"
      href={user.role === "ADMIN" ? "/admin" : "/pengunjung"}
    >
      Dashboard Saya
    </Link>
  ) : (
    <>
      <Link className="login-link" href="/login">
        Masuk
      </Link>
      <Link className="member-btn" href="/register">
        Daftar Anggota
      </Link>
    </>
  );
  return (
    <header className="site-header">
      <div className="landing-shell top-nav">
        <Link className="wordmark" href="/" aria-label="Beranda Perpustakaan">
          <span className="wordmark-box">P</span>
        </Link>
        <nav className="main-nav" aria-label="Navigasi utama">
          {links.map(([label, href, key]) => (
            <Link
              key={key}
              href={href}
              className={active === key ? "nav-active" : undefined}
              aria-current={active === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">{actions}</div>
        <details className="mobile-menu">
          <summary aria-label="Buka menu">
            <span />
            <span />
            <span />
          </summary>
          <div>
            {links.map(([label, href, key]) => (
              <Link
                key={key}
                href={href}
                aria-current={active === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
            {actions}
          </div>
        </details>
      </div>
    </header>
  );
}
