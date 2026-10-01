export default function LandingNavbar() {
  return (
    <header className="site-header">
      <div className="landing-shell top-nav">
        <a className="wordmark" href="#beranda" aria-label="PerpusRiau">
          <span className="wordmark-box">P</span>
        </a>

        <nav className="main-nav" aria-label="Navigasi utama">
          <a className="nav-active" href="#beranda">Beranda</a>
          <a href="#koleksi">Koleksi</a>
          <a href="#ebook">E-Book</a>
          <a href="#layanan">Hibah Buku</a>
          <a href="#tentang">Tentang</a>
          <a href="#panduan">Panduan</a>
          <a href="#faq">FAQ</a>
          <a href="#kontak">Kontak</a>
        </nav>

        <div className="nav-actions">
          <a className="login-link" href="#">Masuk</a>
          <a className="member-btn" href="#">Daftar Anggota</a>
        </div>

        <details className="mobile-menu">
          <summary aria-label="Buka menu"><span /><span /><span /></summary>
          <div>
            <a href="#beranda">Beranda</a>
            <a href="#koleksi">Koleksi</a>
            <a href="#ebook">E-Book</a>
            <a href="#layanan">Hibah Buku</a>
            <a href="#tentang">Tentang</a>
            <a href="#panduan">Panduan</a>
            <a href="#faq">FAQ</a>
            <a href="#kontak">Kontak</a>
            <a href="#">Masuk</a>
            <a className="member-btn" href="#">Daftar Anggota</a>
          </div>
        </details>
      </div>
    </header>
  );
}
