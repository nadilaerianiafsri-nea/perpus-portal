import Image from "next/image";
import Link from "next/link";
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
  FiMonitor,
  FiPhone,
  FiSearch,
} from "react-icons/fi";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import LandingRevealObserver from "@/components/LandingRevealObserver";
import styles from "./HomeLandingRevision.module.css";
import StatCard from "@/components/StatCard";
import { availabilityLabels } from "@/catalog/types";
import { safeCoverUrl } from "@/shared/displayUrls.cjs";
import { getHomeData } from "@/information/homeData";
import {
  formatPublicPhone,
  getLibrarySettings,
} from "@/information/librarySettings";
import {
  getPublicContent,
  renderPublicText,
} from "@/information/publicContent";
import { serviceInfo } from "@/shared/serviceInfo.cjs";

function formatCount(value: number | null) {
  return value === null ? "—" : value.toLocaleString("id-ID");
}

export default async function Home() {
  const [settings, content, homeData] = await Promise.all([
    getLibrarySettings(),
    getPublicContent(),
    getHomeData(),
  ]);

  const steps = content.guide.steps.map((step, index) => ({
    no: String(index + 1).padStart(2, "0"),
    title: renderPublicText(step.title.replace(/^\d+\.\s*/, ""), settings),
    description: renderPublicText(step.description, settings),
  }));
  const continuationPreview =
    homeData.latestBooks[4] ??
    homeData.latestBooks[homeData.latestBooks.length - 1] ??
    null;

  return (
    <>
      <LandingNavbar />
      <LandingRevealObserver />
      <main data-landing-reveal-root>
        <section className={`hero ${styles.heroBlend}`} id="beranda">
          <div className="landing-shell hero-grid">
            <div className="hero-copy">
              <h1 className="hero-title-cms">
                {renderPublicText(content.home.heroTitle, settings)}
              </h1>
              <p>{renderPublicText(content.home.heroDescription, settings)}</p>
              <form className="hero-search" action="/koleksi" method="get">
                <input
                  name="search"
                  type="search"
                  placeholder="Cari judul, penulis, topik, ISBN..."
                  aria-label="Cari koleksi"
                />
                <button
                  data-button="primary"
                  data-button-size="sm"
                  data-button-shape="square"
                  type="submit"
                  aria-label="Cari"
                >
                  <FiSearch />
                </button>
              </form>
              <div className="hero-actions">
                <Link
                  data-button="primary"
                  data-button-size="md"
                  className="navy-btn"
                  href="/koleksi"
                >
                  <FiSearch /> Cari Koleksi
                </Link>
                <Link
                  data-button="secondary"
                  data-button-size="md"
                  className="soft-link"
                  href="/e-book"
                >
                  <FiBookOpen /> Jelajahi E-Book
                </Link>
              </div>
            </div>
            <div className={`hero-art ${styles.heroVisual}`}>
              <Image
                src="/images/ASSET PERPUS/BG LANDING PAGE.png"
                alt={`Ilustrasi ${settings.libraryName}`}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        <section
          className={`stats-wrap ${styles.statsBand} ${styles.revealSection}`}
          aria-label="Ringkasan perpustakaan"
        >
          <div className={`landing-shell stats-card ${styles.statsGrid}`}>
            <StatCard
              label="Judul Koleksi Fisik"
              value={formatCount(homeData.stats.physicalTitles)}
              tone="dark"
              icon={<FiBookOpen />}
            />
            <StatCard
              label="E-Book Digital"
              value={formatCount(homeData.stats.ebooks)}
              tone="yellow"
              icon={<FiMonitor />}
            />
            <StatCard
              label="Jam Layanan"
              value={settings.serviceHours}
              tone="info"
              icon={<FiClock />}
            />
          </div>
        </section>

        <section className={`quick-section ${styles.quickBand} ${styles.revealSection}`}>
          <div className="landing-shell quick-grid">
            <Link href="/koleksi">
              <span><FiSearch /></span>
              <div><strong>Cari Buku</strong><small>Telusuri koleksi & ketersediaan</small></div>
            </Link>
            <Link href="/dashboard/pinjaman">
              <span><FiList /></span>
              <div><strong>Peminjaman Saya</strong><small>Pinjaman & riwayat aktif Anda</small></div>
            </Link>
            <Link href="/e-book">
              <span><FiBookOpen /></span>
              <div><strong>E-Book</strong><small>Baca koleksi digital kapan saja</small></div>
            </Link>
            <Link href="/panduan">
              <span><FiCalendar /></span>
              <div><strong>Panduan Peminjaman</strong><small>Alur dan aturan layanan</small></div>
            </Link>
          </div>
        </section>

        <section
          className={`collection section-pad compact-section ${styles.collectionBlend} ${styles.revealSection}`}
          id="koleksi"
        >
          <div className="landing-shell">
            <div className="section-head">
              <h2>{content.home.latestTitle}</h2>
              <p>{content.home.latestDescription}</p>
            </div>
            {homeData.latestBooks.length ? (
              <div className={`book-grid ${styles.latestCollectionGrid}`} data-collection-grid>
                {homeData.latestBooks.slice(0, 4).map((book) => (
                  <Link
                    className={`book-card ${styles.latestBookCard}`}
                    data-collection-card
                    href={`/koleksi/${book.id}`}
                    aria-label={`Lihat detail ${book.title}`}
                    key={book.id}
                  >
                    <div className={`book-image ${styles.latestBookCover}`}>
                      <Image
                        src={safeCoverUrl(book.coverUrl)}
                        alt={`Sampul ${book.title}`}
                        fill
                        sizes="(max-width: 560px) 100vw, (max-width: 1080px) 50vw, 220px"
                      />
                      <span
                        className={`${styles.latestBookType} ${
                          book.type === "EBOOK"
                            ? styles.latestBookTypeEbook
                            : styles.latestBookTypePhysical
                        }`}
                      >
                        {book.type === "EBOOK" ? "E-Book" : "Fisik"}
                      </span>
                    </div>
                    <div className={styles.latestBookInfo}>
                      <span className={styles.latestBookSubject}>
                        {book.subject || "Koleksi"}
                      </span>
                      <h3>{book.title}</h3>
                      <p>{book.author}</p>
                      {book.type === "FISIK" ? (
                        <span className={styles.latestBookAvailability}>
                          {book.availability
                            ? availabilityLabels[book.availability]
                            : "Ketersediaan diperbarui"}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
                <Link
                  className={styles.collectionContinueCard}
                  data-collection-cta
                  href="/koleksi"
                  aria-label="Lihat semua koleksi publik"
                >
                  {continuationPreview ? (
                    <div className={styles.collectionContinueMedia} aria-hidden="true">
                      <Image
                        src={safeCoverUrl(continuationPreview.coverUrl)}
                        alt=""
                        fill
                        sizes="(max-width: 560px) 100vw, (max-width: 1080px) 50vw, 220px"
                      />
                      <div className={styles.collectionContinueMediaOverlay} />
                    </div>
                  ) : null}
                  <FiArrowRight
                    className={styles.collectionContinueArrow}
                    aria-hidden="true"
                  />
                  <div className={styles.collectionContinueBody}>
                    <span>KOLEKSI PUBLIK</span>
                    <strong>Lihat semua koleksi</strong>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="landing-empty-state">
                Koleksi terbaru belum dapat dimuat. Silakan buka katalog untuk melihat data terkini.
              </div>
            )}
          </div>
        </section>

        <section className={`subject-section section-pad compact-section ${styles.subjectBlend} ${styles.revealSection}`}>
          <div className="landing-shell subject-grid">
            <div>
              <h2>{content.home.subjectsTitle}</h2>
              <p>{content.home.subjectsDescription}</p>
              {homeData.subjects.length ? (
                <div className="subject-list">
                  {homeData.subjects.map((item) => (
                    <Link
                      href={`/koleksi?subject=${encodeURIComponent(item)}`}
                      key={item}
                    >
                      {item}<FiArrowRight />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="landing-inline-state">Daftar subjek belum dapat dimuat.</p>
              )}
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

        <section
          className={`service-dark section-pad compact-dark-section ${styles.serviceBlend} ${styles.revealSection}`}
          id="layanan"
        >
          <div className="landing-shell">
            <div className="section-head centered light">
              <h2>{content.home.servicesTitle}</h2>
              <p>{content.home.servicesDescription}</p>
            </div>
            <div className="feature-row landing-motion-card">
              <div className="feature-copy">
                <span className="mini-tag">Layanan 01</span>
                <h3>Cari Koleksi & Reservasi Buku</h3>
                <p>
                  Telusuri koleksi lengkap perpustakaan, cek status ketersediaan,
                  lalu reservasi langsung sebelum datang.
                </p>
                <div className="pill-row">
                  <span><FiSearch /> Katalog lengkap</span>
                  <span><FiClock /> Reservasi {settings.reservationDurationHours} jam</span>
                  <span><FiMapPin /> Cek rak buku</span>
                </div>
                <Link className="feature-text-link" href="/koleksi">
                  Buka katalog <FiArrowRight />
                </Link>
              </div>
              <div className="feature-art">
                <Image src="/images/ASSET PERPUS/Hero pegang buku.png" alt="Cari koleksi dan reservasi" fill sizes="460px" />
              </div>
            </div>
            <div className="feature-row reverse landing-motion-card">
              <div className="feature-art">
                <Image src="/images/ASSET PERPUS/Hero peminjaman.png" alt="Perpanjangan peminjaman" fill sizes="460px" />
              </div>
              <div className="feature-copy">
                <span className="mini-tag">Layanan 02</span>
                <h3>Perpanjang Pinjaman & Reminder Otomatis</h3>
                <p>
                  {settings.maxExtensions === 0
                    ? "Perpanjangan pinjaman sedang dinonaktifkan. Pengingat jatuh tempo tetap tersedia."
                    : `Perpanjang pinjaman +${settings.extensionDurationDays} hari dari akun anggota dan pantau pengingat sebelum jatuh tempo.`}
                </p>
                <div className="pill-row">
                  <span><FiCalendar /> Perpanjang {settings.extensionDurationDays} hari</span>
                  <span><FiBell /> Reminder otomatis</span>
                  <span><FiMail /> Info via email</span>
                </div>
                <Link className="feature-text-link" href="/dashboard/pinjaman">
                  Kelola pinjaman <FiArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={`borrow-flow section-pad compact-section ${styles.borrowBlend} ${styles.revealSection}`}>
          <div className="landing-shell">
            <div className="section-head centered">
              <h2>{content.home.borrowingTitle}</h2>
              <p>{content.home.borrowingDescription}</p>
            </div>
            <div className="step-grid">
              {steps.map(({ no, title, description }, index) => (
                <article className={index === 5 ? "active" : ""} key={`${no}-${title}`}>
                  <span>{no}</span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </article>
              ))}
            </div>
            <div className="section-action-center">
              <Link data-button="secondary" data-button-size="sm" href="/panduan">
                Lihat panduan lengkap <FiArrowRight />
              </Link>
            </div>
          </div>
        </section>

        <section className={`ebook-section section-pad compact-section ${styles.ebookBlend} ${styles.revealSection}`} id="ebook">
          <div className="landing-shell ebook-grid">
            <div className="ebook-art landing-motion-card">
              <Image src="/images/ASSET PERPUS/Hero pegang buku.png" alt="Baca E-Book Perpustakaan" fill sizes="480px" />
            </div>
            <div className="ebook-copy">
              <h2>{content.home.ebookTitle}</h2>
              <p>{content.home.ebookDescription}</p>
              <ul>
                <li><FiCheckCircle /> Baca langsung di browser</li>
                <li><FiCheckCircle /> Akses dengan akun anggota</li>
                <li><FiCheckCircle /> Tersedia untuk perangkat mobile</li>
              </ul>
              <div className="hero-actions">
                <Link data-button="primary" data-button-size="md" className="navy-btn" href="/e-book">
                  <FiBookOpen /> Jelajahi E-Book
                </Link>
                <Link data-button="secondary" data-button-size="md" className="outline-btn" href="/e-book">
                  Lihat Semua
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={`reminder-section section-pad compact-section ${styles.reminderBlend} ${styles.revealSection}`}>
          <div className="landing-shell">
            <div className="section-head centered">
              <h2>{content.home.reminderTitle}</h2>
              <p>{content.home.reminderDescription}</p>
            </div>
            <div className="reminder-grid">
              <article>
                <div className="reminder-icon"><FiCalendar /></div>
                <div>
                  <h3>Perpanjang Pinjaman +{settings.extensionDurationDays} Hari</h3>
                  <p>Ajukan perpanjangan langsung dari akun tanpa harus datang.</p>
                  <Link data-button="primary" data-button-size="sm" href="/dashboard/pinjaman">
                    Kelola Pinjaman <FiArrowRight />
                  </Link>
                </div>
              </article>
              <article>
                <div className="reminder-icon"><FiBell /></div>
                <div>
                  <h3>Reminder via Email</h3>
                  <p>Notifikasi membantu Anda memantau masa pinjaman dan jatuh tempo.</p>
                  <Link data-button="accent" data-button-size="sm" href="/panduan">
                    Lihat Panduan <FiArrowRight />
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={`member-cta section-pad compact-dark-section ${styles.memberBlend} ${styles.revealSection}`}>
          <div className="landing-shell member-grid">
            <div>
              <h2>{content.home.membershipTitle}</h2>
              <p>{content.home.membershipDescription}</p>
              <ul>
                <li><FiCheckCircle /> Koleksi fisik dengan reservasi</li>
                <li><FiCheckCircle /> E-book yang bisa dibaca kapan saja</li>
                <li><FiCheckCircle /> Reminder jatuh tempo otomatis</li>
                <li><FiCheckCircle /> Riwayat pinjaman terintegrasi</li>
              </ul>
              <div className="hero-actions">
                <Link data-button="primary" data-button-size="md" data-button-inverse className="yellow-btn" href="/register">
                  Daftar Anggota
                </Link>
                <Link data-button="ghost" data-button-size="md" data-button-inverse className="dark-outline-btn" href="/login">
                  Masuk
                </Link>
              </div>
            </div>
            <div className="member-art landing-motion-card">
              <Image src="/images/ASSET PERPUS/Hero pegang buku.png" alt="Keanggotaan perpustakaan" fill sizes="380px" />
            </div>
          </div>
        </section>

        <section className={`info-section section-pad compact-section ${styles.infoBlend} ${styles.revealSection}`}>
          <div className="landing-shell">
            <div className="section-head"><h2>{content.home.informationTitle}</h2></div>
            <div className="info-grid">
              <article><FiClock /><div><span>JAM LAYANAN</span><strong>{settings.serviceHours}</strong></div></article>
              <article><FiMapPin /><div><span>ALAMAT</span><strong><a href={serviceInfo.openStreetMapUrl} target="_blank" rel="noopener noreferrer">{settings.address}</a></strong></div></article>
              <article><FiPhone /><div><span>KONTAK</span><strong><a href={`tel:${settings.phoneE164}`}>{formatPublicPhone(settings.phoneE164)}</a></strong><a href={`mailto:${serviceInfo.email}`}>{serviceInfo.email}</a></div></article>
            </div>
            <div className="contact-center">
              <Link data-button="primary" data-button-size="md" className="outline-btn" href="/kontak">
                <FiMail /> Hubungi Kami
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
