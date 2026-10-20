export type PublicContentStep = {
  title: string;
  description: string;
};

export type PublicFaqItem = {
  id: string;
  question: string;
  answer: string;
};

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
    features: PublicContentStep[];
    visionTitle: string;
    visionText: string;
  };
  guide: {
    title: string;
    intro: string;
    steps: PublicContentStep[];
    reminderTitle: string;
    reminderText: string;
  };
  faq: {
    title: string;
    intro: string;
    items: PublicFaqItem[];
  };
  contact: {
    title: string;
    intro: string;
  };
};

export const defaultPublicContent: PublicContent = {
  home: {
    heroTitle: "Temukan\nPengetahuan,\ndalam Satu\nAkses",
    heroDescription:
      "Jelajahi koleksi fisik dan e-book, reservasi buku, serta kelola keanggotaan Anda — semua dari satu portal yang mudah diakses.",
    latestTitle: "Koleksi Terbaru",
    latestDescription: "Temukan koleksi yang baru ditambahkan.",
    subjectsTitle: "Jelajahi Berdasarkan Subjek",
    subjectsDescription:
      "Temukan buku yang tepat sesuai bidang dan kebutuhan Anda.",
    servicesTitle: "Layanan Perpustakaan dalam Satu Platform",
    servicesDescription:
      "Dua layanan utama untuk pengalaman yang nyaman — cari dan reservasi buku serta perpanjangan pinjaman.",
    borrowingTitle: "Cara Peminjaman Fisik",
    borrowingDescription:
      "Ikuti alur layanan dari pencarian hingga pengembalian buku.",
    ebookTitle: "Baca E-Book Perpustakaan",
    ebookDescription:
      "Nikmati koleksi e-book untuk berbagai kebutuhan langsung dari perangkat Anda. Tidak perlu antre dan dapat diakses kapan saja.",
    reminderTitle: "Tidak Pernah Terlewat Jatuh Tempo",
    reminderDescription:
      "Reminder otomatis membantu Anda mengelola pinjaman.",
    grantsTitle: "Informasi Hibah Buku",
    grantsDescription:
      "Perpustakaan menampilkan informasi penerimaan hibah secara transparan untuk mendukung pengembangan koleksi.",
    membershipTitle: "Mulai Akses Layanan Perpustakaan",
    membershipDescription:
      "Daftarkan diri sebagai anggota dan nikmati seluruh layanan perpustakaan.",
    informationTitle: "Informasi Layanan",
  },
  about: {
    title: "Tentang Perpustakaan",
    intro:
      "Portal perpustakaan digital Kementerian Hukum Riau yang menghubungkan koleksi, layanan anggota, dan informasi perpustakaan dalam satu akses.",
    features: [
      {
        title: "Koleksi Terkurasi",
        description:
          "Koleksi fisik dan e-book tertata dengan metadata katalog yang mudah ditelusuri.",
      },
      {
        title: "Layanan Anggota",
        description:
          "Melayani masyarakat umum, mahasiswa, dan pegawai melalui layanan yang terintegrasi.",
      },
      {
        title: "Layanan Transparan",
        description:
          "Informasi ketersediaan, reservasi, pinjaman, dan pengingat disajikan secara jelas.",
      },
    ],
    visionTitle: "Visi Layanan",
    visionText:
      "Menyediakan akses pengetahuan yang mudah, transparan, dan dapat diakses oleh seluruh pemustaka.",
  },
  guide: {
    title: "Panduan Peminjaman",
    intro: "Alur layanan dari pencarian hingga pengembalian buku.",
    steps: [
      {
        title: "1. Cari Buku",
        description:
          "Telusuri katalog berdasarkan judul, penulis, subjek, ISBN, atau kode buku.",
      },
      {
        title: "2. Ajukan Peminjaman",
        description:
          "Pilih buku yang tersedia lalu ajukan reservasi melalui akun anggota.",
      },
      {
        title: "3. Reservasi Buku",
        description:
          "Reservasi buku fisik berlaku {reservationDurationHours} jam dan satu stok dikunci untuk Anda.",
      },
      {
        title: "4. Ambil di Perpustakaan",
        description:
          "Datang sesuai jadwal. Masa pinjam {loanDurationDays} hari dimulai setelah petugas mengonfirmasi pengambilan.",
      },
      {
        title: "5. Baca & Kembalikan",
        description:
          "Gunakan buku selama masa pinjam aktif dan kembalikan melalui petugas sebelum jatuh tempo.",
      },
      {
        title: "6. Perpanjang Pinjaman",
        description:
          "Jika tersedia, perpanjangan menambah masa pinjam {extensionDurationDays} hari dan berlaku {maxExtensionsText}.",
      },
      {
        title: "7. Selesai",
        description:
          "Riwayat pengembalian tersimpan di akun anggota setelah buku dikonfirmasi kembali.",
      },
    ],
    reminderTitle: "Pengingat layanan",
    reminderText:
      "Pengingat jatuh tempo dikirim melalui kanal notifikasi layanan agar anggota dapat mengelola pinjaman tepat waktu.",
  },
  faq: {
    title: "Pertanyaan yang Sering Diajukan",
    intro: "Jawaban ringkas seputar layanan perpustakaan.",
    items: [
      {
        id: "pendaftaran",
        question: "Apakah pendaftaran memerlukan persetujuan admin?",
        answer:
          "Tidak. Setelah mendaftar dan memverifikasi email, akun aktif dan dapat digunakan untuk login.",
      },
      {
        id: "reservasi",
        question: "Berapa lama reservasi buku fisik berlaku?",
        answer:
          "Reservasi berlaku selama {reservationDurationHours} jam sejak pengajuan. Selama periode tersebut, satu eksemplar dikunci untuk anggota.",
      },
      {
        id: "masa-pinjam",
        question: "Kapan masa pinjam mulai dihitung?",
        answer:
          "Masa pinjam {loanDurationDays} hari mulai dihitung setelah petugas mengonfirmasi bahwa buku telah diambil oleh anggota.",
      },
      {
        id: "perpanjangan",
        question: "Bagaimana aturan perpanjangan pinjaman?",
        answer:
          "Setiap perpanjangan menambah masa pinjam {extensionDurationDays} hari dan berlaku {maxExtensionsText}.",
      },
      {
        id: "keterlambatan",
        question: "Apakah ada denda keterlambatan?",
        answer:
          "Kebijakan keterlambatan mengikuti ketentuan perpustakaan. Gunakan pengingat pada akun anggota untuk memantau jatuh tempo.",
      },
      {
        id: "whatsapp",
        question: "Untuk apa nomor WhatsApp digunakan?",
        answer:
          "Nomor WhatsApp digunakan sebagai salah satu kanal komunikasi layanan dan pengingat kepada anggota.",
      },
      {
        id: "buku-hilang",
        question: "Bagaimana jika buku hilang?",
        answer:
          "Segera hubungi petugas perpustakaan. Penanganan buku hilang dilakukan sesuai kebijakan perpustakaan yang berlaku.",
      },
    ],
  },
  contact: {
    title: "Hubungi Kami",
    intro: "Informasi layanan dan formulir pesan.",
  },
};
