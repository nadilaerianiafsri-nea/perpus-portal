import Image from "next/image";
import {
  FiArrowRight,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiList,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSearch,
} from "react-icons/fi";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import { serviceInfo } from "@/shared/serviceInfo.cjs";

const books = [
  { title: "Koleksi Buku Contoh 1", category: "Umum", image: "/images/ASSET PERPUS/asset buku terbuka.png" },
  { title: "Koleksi Buku Contoh 2", category: "Hukum", image: "/images/ASSET PERPUS/asset tumpukan buku.png" },
  { title: "Koleksi Buku Contoh 3", category: "Referensi", image: "/images/ASSET PERPUS/asset buku.png" },
  { title: "Koleksi Buku Contoh 4", category: "Literasi", image: "/images/ASSET PERPUS/asset rak buku.png" },
  { title: "Koleksi Buku Contoh 5", category: "Arsip", image: "/images/ASSET PERPUS/asset list.png" },
  { title: "Koleksi Buku Contoh 6", category: "Hukum", image: "/images/ASSET PERPUS/asset buku kaca pembesar.png" },
];

const subjects = [
  "Hukum & Perundang-undangan",
  "Administrasi Publik",
  "Sosial & Politik",
  "Ekonomi",
  "Teknologi Informasi",
  "Agama",
  "Referensi Umum",
  "Karya Ilmiah",
];

const steps = [
  ["01", "Cari Buku", "Telusuri koleksi yang tersedia."],
  ["02", "Ajukan Peminjaman", "Pilih buku dan ajukan pinjam."],
  ["03", "Reservasi Buku", "Reservasi jika buku sedang dipinjam."],
  ["04", "Ambil di Perpustakaan", "Datang sesuai jadwal pengambilan."],
  ["05", "Baca & Kembalikan", "Nikmati buku selama masa pinjam."],
  ["06", "Perpanjang 7 Hari", "Perpanjang bila masih dibutuhkan."],
  ["07", "Kembalikan", "Kembalikan sebelum jatuh tempo."],
];

export default function Home() {
  return (
    <>
      <LandingNavbar />

      <main>
        <section className="hero" id="beranda">
          <div className="landing-shell hero-grid">
            <div className="hero-copy">
              <span className="micro-badge">PORTAL RESMI PERPUSTAKAAN KEMENKUM RIAU</span>
              <h1>Temukan<br />Pengetahuan,<br />dalam Satu Akses</h1>
              <p>
                Jelajahi ribuan koleksi fisik dan e-book, reservasi buku,
                serta kelola keanggotaan Anda — semua dari satu portal yang mudah diakses.
              </p>

              <form className="hero-search">
                <input placeholder="Cari judul, penulis, topik, ISBN..." />
                <button type="button" aria-label="Cari"><FiSearch /></button>
              </form>

              <div className="hero-actions">
                <a className="navy-btn" href="#koleksi"><FiSearch /> Cari Koleksi</a>
                <a className="soft-link" href="#ebook"><FiBookOpen /> Jelajahi E-Book</a>
              </div>
            </div>

            <div className="hero-art">
              <Image
                src="/images/ASSET PERPUS/BG LANDING PAGE.png"
                alt="Ilustrasi perpustakaan Kemenkum Riau"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        <section className="stats-wrap">
          <div className="landing-shell stats-card">
            <div><strong>5.000+</strong><span>Judul Koleksi</span></div>
            <div><strong>800+</strong><span>E-Book Digital</span></div>
            <div><strong>24 Jam</strong><span>Portal Akses Aktif</span></div>
          </div>
        </section>

        <section className="quick-section">
          <div className="landing-shell quick-grid">
            <a href="#koleksi"><span><FiSearch /></span><div><strong>Cari Buku</strong><small>Telusuri koleksi & ketersediaan</small></div></a>
            <a href="#layanan"><span><FiList /></span><div><strong>Peminjaman Saya</strong><small>Reservasi & riwayat aktif Anda</small></div></a>
            <a href="#ebook"><span><FiBookOpen /></span><div><strong>E-Book</strong><small>Baca koleksi digital kapan saja</small></div></a>
            <a href="#layanan"><span><FiCalendar /></span><div><strong>Panduan Peminjaman</strong><small>Alur dan aturan layanan</small></div></a>
          </div>
        </section>

        <section className="collection section-pad" id="koleksi">
          <div className="landing-shell">
            <div className="section-head row-head">
              <div>
                <span className="section-kicker">KOLEKSI</span>
                <h2>Koleksi Terbaru</h2>
                <p>Temukan koleksi yang baru ditambahkan.</p>
              </div>
              <a href="#">Lihat semua koleksi <FiArrowRight /></a>
            </div>

            <div className="book-grid">
              {books.map((book, index) => (
                <article className="book-card" key={book.title}>
                  <div className="book-image">
                    <Image src={book.image} alt={book.title} fill sizes="220px" />
                    <span>{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>
                  </div>
                  <div className="book-body">
                    <small>{book.category}</small>
                    <h3>{book.title}</h3>
                    <p>Perpustakaan Digital Kemenkum Riau</p>
                    <div className="availability"><FiCheckCircle /> Tersedia</div>
                    <a href="#">Lihat Detail</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="subject-section section-pad">
          <div className="landing-shell subject-grid">
            <div>
              <span className="section-kicker">KATEGORI KOLEKSI</span>
              <h2>Jelajahi Berdasarkan Subjek</h2>
              <p>Temukan buku yang tepat sesuai bidang dan kebutuhan Anda.</p>
              <div className="subject-list">
                {subjects.map((item) => <a href="#" key={item}>{item}<FiArrowRight /></a>)}
              </div>
            </div>
            <div className="subject-art">
              <Image
                src="/images/ASSET PERPUS/asset buku kaca pembesar.png"
                alt="Ilustrasi pencarian buku"
                fill
                sizes="320px"
              />
            </div>
          </div>
        </section>

        <section className="service-dark section-pad" id="layanan">
          <div className="landing-shell">
            <div className="section-head centered light">
              <span className="section-kicker yellow">LAYANAN KAMI</span>
              <h2>Layanan Perpustakaan dalam Satu Platform</h2>
              <p>Dua layanan utama untuk pengalaman yang nyaman — cari dan reservasi buku serta perpanjangan otomatis.</p>
            </div>

            <div className="feature-row">
              <div className="feature-copy">
                <span className="mini-tag">Layanan 01</span>
                <h3>Cari Koleksi & Reservasi Buku</h3>
                <p>
                  Telusuri koleksi lengkap perpustakaan, cek status ketersediaan,
                  lalu reservasi langsung sebelum datang.
                </p>
                <div className="pill-row">
                  <span><FiSearch /> Katalog lengkap</span>
                  <span><FiClock /> Reservasi 24 jam</span>
                  <span><FiMapPin /> Cek rak buku</span>
                </div>
              </div>
              <div className="feature-art">
                <Image src="/images/ASSET PERPUS/Hero pegang buku.png" alt="Cari koleksi dan reservasi" fill sizes="460px" />
              </div>
            </div>

            <div className="feature-row reverse">
              <div className="feature-art">
                <Image src="/images/ASSET PERPUS/Hero peminjaman.png" alt="Perpanjangan peminjaman" fill sizes="460px" />
              </div>
              <div className="feature-copy">
                <span className="mini-tag">Layanan 02</span>
                <h3>Perpanjang Pinjaman & Reminder Otomatis</h3>
                <p>
                  Perpanjang pinjaman hingga 7 hari tanpa datang ke perpustakaan dan
                  dapatkan pengingat sebelum jatuh tempo.
                </p>
                <div className="pill-row">
                  <span><FiCalendar /> Perpanjang 7 hari</span>
                  <span><FiBell /> Reminder otomatis</span>
                  <span><FiMail /> Info via email</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="borrow-flow section-pad">
          <div className="landing-shell">
            <div className="section-head centered">
              <span className="section-kicker">PANDUAN LAYANAN</span>
              <h2>Cara Peminjaman Fisik</h2>
              <p>Tujuh langkah dari pencarian hingga pengembalian buku.</p>
            </div>
            <div className="step-grid">
              {steps.map(([no, title, text], idx) => (
                <article className={idx === 5 ? "active" : ""} key={no}>
                  <span>{no}</span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ebook-section section-pad" id="ebook">
          <div className="landing-shell ebook-grid">
            <div className="ebook-art">
              <Image src="/images/ASSET PERPUS/Asset banyak burung ikon.jpg" alt="Karakter perpustakaan" fill sizes="480px" />
            </div>
            <div className="ebook-copy">
              <span className="section-kicker">KOLEKSI DIGITAL</span>
              <h2>Baca E-Book Perpustakaan</h2>
              <p>
                Nikmati koleksi e-book untuk berbagai kebutuhan langsung dari perangkat Anda.
                Tidak perlu antre dan dapat diakses kapan saja.
              </p>
              <ul>
                <li><FiCheckCircle /> Baca langsung di browser</li>
                <li><FiCheckCircle /> Akses dengan akun anggota</li>
                <li><FiCheckCircle /> Tersedia untuk perangkat mobile</li>
              </ul>
              <div className="hero-actions">
                <a className="navy-btn" href="#"><FiBookOpen /> Jelajahi E-Book</a>
                <a className="outline-btn" href="#">Lihat Semua</a>
              </div>
            </div>
          </div>
        </section>

        <section className="reminder-section section-pad">
          <div className="landing-shell">
            <div className="section-head centered">
              <span className="section-kicker">PENGINGAT PEMINJAMAN</span>
              <h2>Tidak Pernah Terlewat Jatuh Tempo</h2>
              <p>Reminder otomatis membantu Anda mengelola pinjaman.</p>
            </div>
            <div className="reminder-grid">
              <article>
                <div className="reminder-icon"><FiCalendar /></div>
                <div><span>Perpanjangan</span><h3>Perpanjang Pinjaman +7 Hari</h3><p>Ajukan perpanjangan langsung dari akun tanpa harus datang.</p><a href="#">Kelola Pinjaman <FiArrowRight /></a></div>
              </article>
              <article>
                <div className="reminder-icon"><FiBell /></div>
                <div><span>Reminder Otomatis</span><h3>Reminder via Email</h3><p>Notifikasi sebelum masa pinjaman Anda berakhir.</p><a href="#">Lihat Panduan <FiArrowRight /></a></div>
              </article>
            </div>
          </div>
        </section>

        <section className="donation-section section-pad">
          <div className="landing-shell donation-grid">
            <div>
              <span className="section-kicker">TRANSPARANSI & HIBAH</span>
              <h2>Informasi Hibah Buku</h2>
              <p>
                Perpustakaan menerima hibah buku dan menampilkan informasi penerimaan
                secara transparan untuk mendukung pengembangan koleksi.
              </p>
              <div className="donation-list">
                <div><FiBookOpen /><span><strong>Judul Buku Hibah A</strong><small>Penerimaan hibah koleksi</small></span><b>Diterima</b></div>
                <div><FiBookOpen /><span><strong>Judul Buku Hibah B</strong><small>Penerimaan hibah koleksi</small></span><b>Dalam Proses</b></div>
                <div><FiBookOpen /><span><strong>Judul Buku Hibah C</strong><small>Penerimaan hibah koleksi</small></span><b>Diterima</b></div>
              </div>
              <a className="outline-btn" href="#">Lihat Informasi Hibah <FiArrowRight /></a>
            </div>
            <div className="donation-art">
              <Image src="/images/ASSET PERPUS/asset buku kaca pembesar.png" alt="Informasi hibah buku" fill sizes="330px" />
            </div>
          </div>
        </section>

        <section className="member-cta section-pad">
          <div className="landing-shell member-grid">
            <div>
              <span className="section-kicker yellow">KEANGGOTAAN PERPUSTAKAAN</span>
              <h2>Mulai Akses Layanan Perpustakaan</h2>
              <p>Daftarkan diri sebagai anggota dan nikmati seluruh layanan perpustakaan.</p>
              <ul>
                <li><FiCheckCircle /> Koleksi fisik dengan reservasi</li>
                <li><FiCheckCircle /> E-book yang bisa dibaca kapan saja</li>
                <li><FiCheckCircle /> Reminder jatuh tempo otomatis</li>
                <li><FiCheckCircle /> Riwayat pinjaman terintegrasi</li>
              </ul>
              <div className="hero-actions">
                <a className="yellow-btn" href="#">Daftar Anggota</a>
                <a className="dark-outline-btn" href="#">Masuk</a>
              </div>
            </div>
            <div className="member-art">
              <Image src="/images/ASSET PERPUS/Hero pegang buku.png" alt="Keanggotaan perpustakaan" fill sizes="380px" />
            </div>
          </div>
        </section>

        <section className="info-section section-pad">
          <div className="landing-shell">
            <div className="section-head"><h2>Informasi Layanan</h2></div>
            <div className="info-grid">
              <article><FiClock /><div><span>JAM LAYANAN</span><strong>{serviceInfo.hours}</strong></div></article>
              <article><FiMapPin /><div><span>ALAMAT</span><strong><a href={serviceInfo.openStreetMapUrl} target="_blank" rel="noopener noreferrer">{serviceInfo.address}</a></strong></div></article>
              <article><FiPhone /><div><span>KONTAK</span><strong><a href={serviceInfo.phoneUrl}>{serviceInfo.phone}</a></strong><a href={`mailto:${serviceInfo.email}`}>{serviceInfo.email}</a></div></article>
            </div>
            <div className="contact-center"><a className="outline-btn" href="/kontak"><FiMail /> Hubungi Kami</a></div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
