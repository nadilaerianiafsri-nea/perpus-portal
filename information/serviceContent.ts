import type { PublicLibrarySettings } from "./librarySettings";

function extensionLimitText(settings: PublicLibrarySettings) {
  if (settings.maxExtensions === null) return "tanpa batas maksimal";
  if (settings.maxExtensions === 0) return "perpanjangan sedang dinonaktifkan";
  return `maksimal ${settings.maxExtensions} kali`;
}

export function buildGuideSteps(settings: PublicLibrarySettings) {
  return [
    {
      title: "1. Pendaftaran",
      description:
        "Daftar sebagai anggota, verifikasi email, akun langsung aktif tanpa persetujuan admin.",
    },
    {
      title: "2. Cari Buku",
      description:
        "Telusuri katalog berdasarkan judul, penulis, subjek, ISBN, atau kode buku.",
    },
    {
      title: "3. Ajukan Reservasi",
      description: `Reservasi buku fisik berlaku ${settings.reservationDurationHours} jam; 1 stok buku dikunci untuk Anda.`,
    },
    {
      title: "4. Ambil di Perpustakaan",
      description: `Petugas mengonfirmasi pengambilan. Masa pinjam ${settings.loanDurationDays} hari dimulai setelah konfirmasi.`,
    },
    {
      title: `5. Pinjam ${settings.loanDurationDays} Hari`,
      description:
        settings.maxExtensions === 0
          ? "Perpanjangan sedang dinonaktifkan oleh perpustakaan."
          : `Perpanjang +${settings.extensionDurationDays} hari bila diperlukan, ${extensionLimitText(settings)}.`,
    },
    {
      title: "6. Pengembalian",
      description:
        "Kembalikan melalui petugas. Tidak ada denda keterlambatan.",
    },
  ];
}

export function buildFaqItems(settings: PublicLibrarySettings) {
  return [
    {
      id: "pendaftaran",
      question: "Apakah pendaftaran memerlukan persetujuan admin?",
      answer:
        "Tidak. Setelah mendaftar dan memverifikasi email, akun langsung aktif dan dapat digunakan untuk login.",
    },
    {
      id: "reservasi",
      question: "Berapa lama reservasi buku fisik berlaku?",
      answer: `Reservasi berlaku selama ${settings.reservationDurationHours} jam sejak pengajuan. Selama periode tersebut, satu eksemplar dikunci untuk anggota. Jika tidak diambil sampai batas waktu, reservasi otomatis kedaluwarsa dan stok dilepas kembali.`,
    },
    {
      id: "masa-pinjam",
      question: `Kapan masa pinjam ${settings.loanDurationDays} hari mulai dihitung?`,
      answer: `Masa pinjam ${settings.loanDurationDays} hari mulai dihitung setelah petugas perpustakaan mengonfirmasi bahwa buku telah diambil oleh anggota.`,
    },
    {
      id: "perpanjangan",
      question: "Bagaimana aturan perpanjangan pinjaman?",
      answer:
        settings.maxExtensions === 0
          ? "Perpanjangan saat ini dinonaktifkan oleh perpustakaan."
          : `Setiap perpanjangan menambah masa pinjam ${settings.extensionDurationDays} hari dan berlaku ${extensionLimitText(settings)}.`,
    },
    {
      id: "keterlambatan",
      question: "Apakah ada denda keterlambatan?",
      answer:
        "Tidak ada denda uang. Email pengingat dikirim otomatis pada H-1, hari jatuh tempo, lalu H+2 dan seterusnya selama masih terlambat. WhatsApp ditindaklanjuti manual oleh petugas.",
    },
    {
      id: "whatsapp",
      question: "Apakah nomor WhatsApp wajib?",
      answer:
        "Ya. Nomor WhatsApp wajib diisi karena digunakan untuk pengingat reservasi, jatuh tempo, dan layanan perpustakaan lainnya.",
    },
    {
      id: "buku-hilang",
      question: "Bagaimana jika buku hilang?",
      answer:
        "Segera hubungi petugas perpustakaan. Penanganan buku hilang dilakukan oleh petugas sesuai kebijakan perpustakaan yang berlaku.",
    },
  ];
}
