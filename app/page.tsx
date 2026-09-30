import Image from "next/image";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";

const services = [
  {
    number: "01",
    title: "Pencarian Koleksi",
    description:
      "Cari buku berdasarkan judul, penulis, kategori, atau kata kunci dengan lebih cepat.",
  },
  {
    number: "02",
    title: "Informasi Ketersediaan",
    description:
      "Lihat informasi koleksi dan status ketersediaan buku sebelum melakukan peminjaman.",
  },
  {
    number: "03",
    title: "Riwayat Peminjaman",
    description:
      "Pantau aktivitas peminjaman dan pengembalian buku dari akun pengguna.",
  },
];

const featuredBooks = [
  {
    title: "Pengantar Hukum Indonesia",
    author: "Koleksi Perpustakaan",
    category: "Hukum",
    image: "/images/landing/book-placeholder-1.svg",
  },
  {
    title: "Administrasi dan Pelayanan Publik",
    author: "Koleksi Perpustakaan",
    category: "Referensi",
    image: "/images/landing/book-placeholder-2.svg",
  },
  {
    title: "Literasi Digital",
    author: "Koleksi Perpustakaan",
    category: "Literasi",
    image: "/images/landing/book-placeholder-3.svg",
  },
  {
    title: "Pengetahuan Umum",
    author: "Koleksi Perpustakaan",
    category: "Umum",
    image: "/images/landing/book-placeholder-4.svg",
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="11"
        cy="11"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m16 16 4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m5 12 4 4L19 7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <LandingNavbar />

      <main>
        <section className="hero-section" id="beranda">
          <div className="shell hero-card">
            <div className="hero-content">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Perpustakaan Digital
              </div>

              <h1>
                Temukan pengetahuan untuk
                <span> membuka lebih banyak peluang.</span>
              </h1>

              <p className="hero-description">
                Jelajahi koleksi perpustakaan, temukan buku yang Anda perlukan,
                dan akses layanan perpustakaan dalam satu portal yang sederhana.
              </p>

              <div className="hero-buttons">
                <a className="btn btn-primary btn-large" href="#koleksi">
                  Jelajahi Koleksi
                  <ArrowIcon />
                </a>

                <a className="btn btn-light btn-large" href="#tentang">
                  Tentang Perpustakaan
                </a>
              </div>

              <form className="search-box">
                <span className="search-icon">
                  <SearchIcon />
                </span>

                <input
                  type="search"
                  placeholder="Cari judul, penulis, atau kategori buku..."
                  aria-label="Cari buku"
                />

                <button type="button">Cari</button>
              </form>

              <div className="hero-mini-stats">
                <div>
                  <strong>1.000+</strong>
                  <span>Koleksi buku</span>
                </div>

                <i />

                <div>
                  <strong>20+</strong>
                  <span>Kategori</span>
                </div>

                <i />

                <div>
                  <strong>Digital</strong>
                  <span>Akses lebih mudah</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-image-frame">
                <Image
                  src="/images/landing/hero-placeholder.svg"
                  alt="Foto utama perpustakaan"
                  fill
                  sizes="(max-width: 900px) 100vw, 46vw"
                  className="cover-image"
                  priority
                />

                <div className="photo-label">
                  <small>Tempat foto Anda</small>
                  <strong>Hero / Foto Perpustakaan</strong>
                </div>
              </div>

              <div className="floating-info floating-info-top">
                <span className="mini-icon">B</span>

                <div>
                  <strong>Koleksi lengkap</strong>
                  <small>Mudah ditemukan</small>
                </div>
              </div>

              <div className="floating-info floating-info-bottom">
                <strong>24/7</strong>
                <small>Akses informasi</small>
              </div>
            </div>
          </div>
        </section>

        <section className="service-section section" id="layanan">
          <div className="shell">
            <div className="section-heading centered-heading">
              <span className="section-label">Layanan Utama</span>

              <h2>Perpustakaan yang lebih mudah digunakan.</h2>

              <p>
                Informasi penting dibuat ringkas dan mudah ditemukan agar
                pengunjung dapat fokus pada kebutuhan mereka.
              </p>
            </div>

            <div className="service-grid">
              {services.map((service) => (
                <article className="service-card" key={service.number}>
                  <span className="service-number">
                    {service.number}
                  </span>

                  <div className="service-line" />

                  <h3>{service.title}</h3>

                  <p>{service.description}</p>

                  <a href="#koleksi">
                    Pelajari layanan
                    <ArrowIcon />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="collection-section section" id="koleksi">
          <div className="shell">
            <div className="collection-header">
              <div className="section-heading">
                <span className="section-label">
                  Koleksi Pilihan
                </span>

                <h2>Temukan bacaan yang Anda cari.</h2>

                <p>
                  Tampilan sementara menggunakan gambar pengganti. Nantinya
                  Anda cukup mengganti file gambar di folder public.
                </p>
              </div>

              <a className="text-link" href="#koleksi">
                Lihat semua koleksi
                <ArrowIcon />
              </a>
            </div>

            <div className="book-grid">
              {featuredBooks.map((book) => (
                <article className="book-card" key={book.title}>
                  <div className="book-cover-wrap">
                    <Image
                      src={book.image}
                      alt={`Cover ${book.title}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 25vw"
                      className="book-cover-image"
                    />

                    <span className="book-category">
                      {book.category}
                    </span>
                  </div>

                  <div className="book-content">
                    <h3>{book.title}</h3>

                    <p>{book.author}</p>

                    <a href="#koleksi">
                      Lihat detail
                      <ArrowIcon />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-section section" id="tentang">
          <div className="shell about-grid">
            <div className="about-visual">
              <div className="about-image-frame">
                <Image
                  src="/images/landing/about-placeholder.svg"
                  alt="Foto perpustakaan"
                  fill
                  sizes="(max-width: 900px) 100vw, 48vw"
                  className="cover-image"
                />
              </div>

              <div className="about-accent-card">
                <strong>Ruang untuk belajar</strong>

                <span>
                  Lebih dekat, sederhana, dan mudah diakses.
                </span>
              </div>
            </div>

            <div className="about-content">
              <span className="section-label">
                Tentang Perpustakaan
              </span>

              <h2>
                Informasi dan koleksi dalam satu ruang digital.
              </h2>

              <p>
                Portal ini dirancang untuk membantu pengunjung memperoleh
                informasi mengenai perpustakaan, menelusuri koleksi, dan
                menggunakan layanan secara lebih praktis.
              </p>

              <div className="check-list">
                <div className="check-item">
                  <span>
                    <CheckIcon />
                  </span>

                  <div>
                    <strong>Pencarian lebih cepat</strong>

                    <p>
                      Temukan koleksi tanpa pencarian manual yang panjang.
                    </p>
                  </div>
                </div>

                <div className="check-item">
                  <span>
                    <CheckIcon />
                  </span>

                  <div>
                    <strong>
                      Informasi lebih terorganisasi
                    </strong>

                    <p>
                      Koleksi, kategori, dan informasi layanan ditampilkan
                      dengan struktur yang konsisten.
                    </p>
                  </div>
                </div>

                <div className="check-item">
                  <span>
                    <CheckIcon />
                  </span>

                  <div>
                    <strong>
                      Nyaman di berbagai perangkat
                    </strong>

                    <p>
                      Tampilan menyesuaikan desktop, tablet, maupun
                      perangkat mobile.
                    </p>
                  </div>
                </div>
              </div>

              <a className="btn btn-primary btn-large" href="#koleksi">
                Mulai Jelajahi
                <ArrowIcon />
              </a>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="shell cta-card">
            <div>
              <span className="section-label section-label-light">
                Mulai Sekarang
              </span>

              <h2>
                Temukan koleksi yang Anda butuhkan.
              </h2>

              <p>
                Masuk ke akun Anda untuk mendapatkan akses ke fitur
                perpustakaan yang tersedia.
              </p>
            </div>

            <div className="cta-actions">
              <a className="btn btn-white btn-large" href="#">
                Masuk
                <ArrowIcon />
              </a>

              <a className="btn btn-outline-light btn-large" href="#">
                Buat Akun
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}