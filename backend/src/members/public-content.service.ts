import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ContentStep = { title: string; description: string };
type FaqItem = { id: string; question: string; answer: string };

export type PublicContent = {
  home: {
    heroTitle: string;
    heroDescription: string;
    latestTitle: string;
    latestDescription: string;
    subjectsTitle: string;
    subjectsDescription: string;
    servicesTitle: string;
    servicesDescription: string;
    borrowingTitle: string;
    borrowingDescription: string;
    ebookTitle: string;
    ebookDescription: string;
    reminderTitle: string;
    reminderDescription: string;
    grantsTitle: string;
    grantsDescription: string;
    membershipTitle: string;
    membershipDescription: string;
    informationTitle: string;
  };
  about: {
    title: string;
    intro: string;
    features: ContentStep[];
    visionTitle: string;
    visionText: string;
  };
  guide: {
    title: string;
    intro: string;
    steps: ContentStep[];
    reminderTitle: string;
    reminderText: string;
  };
  faq: {
    title: string;
    intro: string;
    items: FaqItem[];
  };
  contact: {
    title: string;
    intro: string;
  };
};

const DEFAULT_CONTENT: PublicContent = {
  home: {
    heroTitle: 'Temukan\nPengetahuan,\ndalam Satu\nAkses',
    heroDescription:
      'Jelajahi koleksi fisik dan e-book, reservasi buku, serta kelola keanggotaan Anda — semua dari satu portal yang mudah diakses.',
    latestTitle: 'Koleksi Terbaru',
    latestDescription: 'Temukan koleksi yang baru ditambahkan.',
    subjectsTitle: 'Jelajahi Berdasarkan Subjek',
    subjectsDescription:
      'Temukan buku yang tepat sesuai bidang dan kebutuhan Anda.',
    servicesTitle: 'Layanan Perpustakaan dalam Satu Platform',
    servicesDescription:
      'Dua layanan utama untuk pengalaman yang nyaman — cari dan reservasi buku serta perpanjangan pinjaman.',
    borrowingTitle: 'Cara Peminjaman Fisik',
    borrowingDescription:
      'Ikuti alur layanan dari pencarian hingga pengembalian buku.',
    ebookTitle: 'Baca E-Book Perpustakaan',
    ebookDescription:
      'Nikmati koleksi e-book untuk berbagai kebutuhan langsung dari perangkat Anda. Tidak perlu antre dan dapat diakses kapan saja.',
    reminderTitle: 'Tidak Pernah Terlewat Jatuh Tempo',
    reminderDescription:
      'Reminder otomatis membantu Anda mengelola pinjaman.',
    grantsTitle: 'Informasi Hibah Buku',
    grantsDescription:
      'Perpustakaan menampilkan informasi penerimaan hibah secara transparan untuk mendukung pengembangan koleksi.',
    membershipTitle: 'Mulai Akses Layanan Perpustakaan',
    membershipDescription:
      'Daftarkan diri sebagai anggota dan nikmati seluruh layanan perpustakaan.',
    informationTitle: 'Informasi Layanan',
  },
  about: {
    title: 'Tentang Perpustakaan',
    intro:
      'Portal perpustakaan digital Kementerian Hukum Riau yang menghubungkan koleksi, layanan anggota, dan informasi perpustakaan dalam satu akses.',
    features: [
      {
        title: 'Koleksi Terkurasi',
        description:
          'Koleksi fisik dan e-book tertata dengan metadata katalog yang mudah ditelusuri.',
      },
      {
        title: 'Layanan Anggota',
        description:
          'Melayani masyarakat umum, mahasiswa, dan pegawai melalui layanan yang terintegrasi.',
      },
      {
        title: 'Layanan Transparan',
        description:
          'Informasi ketersediaan, reservasi, pinjaman, dan pengingat disajikan secara jelas.',
      },
    ],
    visionTitle: 'Visi Layanan',
    visionText:
      'Menyediakan akses pengetahuan yang mudah, transparan, dan dapat diakses oleh seluruh pemustaka.',
  },
  guide: {
    title: 'Panduan Peminjaman',
    intro: 'Alur layanan dari pencarian hingga pengembalian buku.',
    steps: [
      {
        title: '1. Cari Buku',
        description:
          'Telusuri katalog berdasarkan judul, penulis, subjek, ISBN, atau kode buku.',
      },
      {
        title: '2. Ajukan Peminjaman',
        description:
          'Pilih buku yang tersedia lalu ajukan reservasi melalui akun anggota.',
      },
      {
        title: '3. Reservasi Buku',
        description:
          'Reservasi buku fisik berlaku {reservationDurationHours} jam dan satu stok dikunci untuk Anda.',
      },
      {
        title: '4. Ambil di Perpustakaan',
        description:
          'Datang sesuai jadwal. Masa pinjam {loanDurationDays} hari dimulai setelah petugas mengonfirmasi pengambilan.',
      },
      {
        title: '5. Baca & Kembalikan',
        description:
          'Gunakan buku selama masa pinjam aktif dan kembalikan melalui petugas sebelum jatuh tempo.',
      },
      {
        title: '6. Perpanjang Pinjaman',
        description:
          'Jika tersedia, perpanjangan menambah masa pinjam {extensionDurationDays} hari dan berlaku {maxExtensionsText}.',
      },
      {
        title: '7. Selesai',
        description:
          'Riwayat pengembalian tersimpan di akun anggota setelah buku dikonfirmasi kembali.',
      },
    ],
    reminderTitle: 'Pengingat layanan',
    reminderText:
      'Pengingat jatuh tempo dikirim melalui kanal notifikasi layanan agar anggota dapat mengelola pinjaman tepat waktu.',
  },
  faq: {
    title: 'Pertanyaan yang Sering Diajukan',
    intro: 'Jawaban ringkas seputar layanan perpustakaan.',
    items: [
      {
        id: 'pendaftaran',
        question: 'Apakah pendaftaran memerlukan persetujuan admin?',
        answer:
          'Tidak. Setelah mendaftar dan memverifikasi email, akun aktif dan dapat digunakan untuk login.',
      },
      {
        id: 'reservasi',
        question: 'Berapa lama reservasi buku fisik berlaku?',
        answer:
          'Reservasi berlaku selama {reservationDurationHours} jam sejak pengajuan. Selama periode tersebut, satu eksemplar dikunci untuk anggota.',
      },
      {
        id: 'masa-pinjam',
        question: 'Kapan masa pinjam mulai dihitung?',
        answer:
          'Masa pinjam {loanDurationDays} hari mulai dihitung setelah petugas mengonfirmasi bahwa buku telah diambil oleh anggota.',
      },
      {
        id: 'perpanjangan',
        question: 'Bagaimana aturan perpanjangan pinjaman?',
        answer:
          'Setiap perpanjangan menambah masa pinjam {extensionDurationDays} hari dan berlaku {maxExtensionsText}.',
      },
      {
        id: 'keterlambatan',
        question: 'Apakah ada denda keterlambatan?',
        answer:
          'Kebijakan keterlambatan mengikuti ketentuan perpustakaan. Gunakan pengingat pada akun anggota untuk memantau jatuh tempo.',
      },
      {
        id: 'whatsapp',
        question: 'Untuk apa nomor WhatsApp digunakan?',
        answer:
          'Nomor WhatsApp digunakan sebagai salah satu kanal komunikasi layanan dan pengingat kepada anggota.',
      },
      {
        id: 'buku-hilang',
        question: 'Bagaimana jika buku hilang?',
        answer:
          'Segera hubungi petugas perpustakaan. Penanganan buku hilang dilakukan sesuai kebijakan perpustakaan yang berlaku.',
      },
    ],
  },
  contact: {
    title: 'Hubungi Kami',
    intro: 'Informasi layanan dan formulir pesan.',
  },
};

type JsonObject = Record<string, unknown>;
type ContentRow = { contentJson: string };

function object(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function text(
  value: unknown,
  fallback: string,
  label: string,
  max: number,
  strict: boolean,
) {
  if (typeof value !== 'string') {
    if (strict) throw new BadRequestException(`${label} wajib diisi.`);
    return fallback;
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > max || /[<>]/.test(normalized)) {
    if (strict) {
      throw new BadRequestException(
        `${label} tidak valid atau melebihi ${max} karakter.`,
      );
    }
    return fallback;
  }
  return normalized;
}

function steps(
  value: unknown,
  fallback: ContentStep[],
  label: string,
  strict: boolean,
) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) {
    if (strict)
      throw new BadRequestException(`${label} harus memiliki 1–12 item.`);
    return fallback.map((item) => ({ ...item }));
  }
  return value.map((item, index) => {
    const source = object(item);
    const base = fallback[index] ?? fallback[fallback.length - 1];
    if (!source && strict)
      throw new BadRequestException(`${label} item ${index + 1} tidak valid.`);
    return {
      title: text(
        source?.title,
        base.title,
        `${label} judul ${index + 1}`,
        120,
        strict,
      ),
      description: text(
        source?.description,
        base.description,
        `${label} deskripsi ${index + 1}`,
        600,
        strict,
      ),
    };
  });
}

function faqs(
  value: unknown,
  fallback: FaqItem[],
  strict: boolean,
): FaqItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    if (strict)
      throw new BadRequestException('FAQ harus memiliki 1–20 item.');
    return fallback.map((item) => ({ ...item }));
  }
  const ids = new Set<string>();
  return value.map((item, index) => {
    const source = object(item);
    const base = fallback[index] ?? fallback[fallback.length - 1];
    if (!source && strict)
      throw new BadRequestException(`FAQ item ${index + 1} tidak valid.`);
    const rawId =
      typeof source?.id === 'string' ? source.id.trim().toLowerCase() : base.id;
    const id = /^[a-z0-9-]{2,60}$/.test(rawId) ? rawId : base.id;
    if (strict && ids.has(id))
      throw new BadRequestException(`ID FAQ ${id} tidak boleh duplikat.`);
    ids.add(id);
    return {
      id,
      question: text(
        source?.question,
        base.question,
        `Pertanyaan FAQ ${index + 1}`,
        240,
        strict,
      ),
      answer: text(
        source?.answer,
        base.answer,
        `Jawaban FAQ ${index + 1}`,
        1200,
        strict,
      ),
    };
  });
}

function parseContent(value: unknown, strict: boolean): PublicContent {
  const root = object(value) ?? {};
  const home = object(root.home) ?? {};
  const about = object(root.about) ?? {};
  const guide = object(root.guide) ?? {};
  const faq = object(root.faq) ?? {};
  const contact = object(root.contact) ?? {};

  if (strict && (!object(value) || !object(root.home) || !object(root.about))) {
    throw new BadRequestException('Struktur konten publik tidak valid.');
  }

  const homeText = <K extends keyof PublicContent['home']>(key: K, max = 500) =>
    text(home[key], DEFAULT_CONTENT.home[key], `Beranda ${key}`, max, strict);

  return {
    home: {
      heroTitle: homeText('heroTitle', 160),
      heroDescription: homeText('heroDescription', 700),
      latestTitle: homeText('latestTitle', 120),
      latestDescription: homeText('latestDescription', 400),
      subjectsTitle: homeText('subjectsTitle', 120),
      subjectsDescription: homeText('subjectsDescription', 400),
      servicesTitle: homeText('servicesTitle', 160),
      servicesDescription: homeText('servicesDescription', 600),
      borrowingTitle: homeText('borrowingTitle', 120),
      borrowingDescription: homeText('borrowingDescription', 400),
      ebookTitle: homeText('ebookTitle', 120),
      ebookDescription: homeText('ebookDescription', 600),
      reminderTitle: homeText('reminderTitle', 120),
      reminderDescription: homeText('reminderDescription', 400),
      grantsTitle: homeText('grantsTitle', 120),
      grantsDescription: homeText('grantsDescription', 600),
      membershipTitle: homeText('membershipTitle', 140),
      membershipDescription: homeText('membershipDescription', 500),
      informationTitle: homeText('informationTitle', 120),
    },
    about: {
      title: text(about.title, DEFAULT_CONTENT.about.title, 'Tentang judul', 140, strict),
      intro: text(about.intro, DEFAULT_CONTENT.about.intro, 'Tentang intro', 800, strict),
      features: steps(about.features, DEFAULT_CONTENT.about.features, 'Fitur Tentang', strict),
      visionTitle: text(
        about.visionTitle,
        DEFAULT_CONTENT.about.visionTitle,
        'Judul visi',
        140,
        strict,
      ),
      visionText: text(
        about.visionText,
        DEFAULT_CONTENT.about.visionText,
        'Isi visi',
        1200,
        strict,
      ),
    },
    guide: {
      title: text(guide.title, DEFAULT_CONTENT.guide.title, 'Panduan judul', 140, strict),
      intro: text(guide.intro, DEFAULT_CONTENT.guide.intro, 'Panduan intro', 500, strict),
      steps: steps(guide.steps, DEFAULT_CONTENT.guide.steps, 'Langkah panduan', strict),
      reminderTitle: text(
        guide.reminderTitle,
        DEFAULT_CONTENT.guide.reminderTitle,
        'Judul pengingat panduan',
        140,
        strict,
      ),
      reminderText: text(
        guide.reminderText,
        DEFAULT_CONTENT.guide.reminderText,
        'Isi pengingat panduan',
        1000,
        strict,
      ),
    },
    faq: {
      title: text(faq.title, DEFAULT_CONTENT.faq.title, 'FAQ judul', 140, strict),
      intro: text(faq.intro, DEFAULT_CONTENT.faq.intro, 'FAQ intro', 500, strict),
      items: faqs(faq.items, DEFAULT_CONTENT.faq.items, strict),
    },
    contact: {
      title: text(
        contact.title,
        DEFAULT_CONTENT.contact.title,
        'Kontak judul',
        140,
        strict,
      ),
      intro: text(
        contact.intro,
        DEFAULT_CONTENT.contact.intro,
        'Kontak intro',
        500,
        strict,
      ),
    },
  };
}

@Injectable()
export class PublicContentService {
  constructor(private readonly prisma: PrismaService) {}

  defaults(): PublicContent {
    return structuredClone(DEFAULT_CONTENT);
  }

  async getPublicSummary() {
    const [physicalTitles, ebooks] = await Promise.all([
      this.prisma.book.count({ where: { type: 'FISIK', isActive: true } }),
      this.prisma.book.count({ where: { type: 'EBOOK', isActive: true } }),
    ]);
    return {
      physicalTitles,
      ebooks,
      generatedAt: new Date().toISOString(),
    };
  }

  async getContent(): Promise<PublicContent> {
    try {
      const rows = await this.prisma.$queryRaw<ContentRow[]>`
        SELECT contentJson
        FROM public_content
        WHERE id = 1
        LIMIT 1
      `;
      const raw = rows[0]?.contentJson;
      if (!raw) return this.defaults();
      return parseContent(JSON.parse(raw) as unknown, false);
    } catch {
      return this.defaults();
    }
  }

  async updateContent(body: unknown): Promise<PublicContent> {
    const content = parseContent(body, true);
    const contentJson = JSON.stringify(content);
    try {
      await this.prisma.$executeRaw`
        INSERT INTO public_content (id, contentJson)
        VALUES (1, ${contentJson})
        ON DUPLICATE KEY UPDATE contentJson = VALUES(contentJson)
      `;
      return content;
    } catch {
      throw new ServiceUnavailableException(
        'Konten publik belum dapat disimpan. Pastikan tabel public_content sudah tersedia.',
      );
    }
  }
}
