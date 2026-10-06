export const guideSteps = [
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
    description:
      "Reservasi buku fisik berlaku 24 jam; 1 stok buku dikunci untuk Anda.",
  },
  {
    title: "4. Ambil di Perpustakaan",
    description:
      "Petugas mengonfirmasi pengambilan. Masa pinjam 7 hari dimulai setelah konfirmasi.",
  },
  {
    title: "5. Pinjam 7 Hari",
    description:
      "Perpanjang +7 hari kapan pun diperlukan, tanpa batas maksimal untuk saat ini.",
  },
  {
    title: "6. Pengembalian",
    description:
      "Kembalikan melalui petugas. Tidak ada denda keterlambatan.",
  },
];

export const faqItems = [
  {
    id: "pendaftaran",
    question: "Apakah pendaftaran memerlukan persetujuan admin?",
    answer:
      "Tidak. Setelah mendaftar dan memverifikasi email, akun langsung aktif dan dapat digunakan untuk login.",
  },
  {
    id: "reservasi",
    question: "Berapa lama reservasi buku fisik berlaku?",
    answer:
      "Reservasi berlaku selama 24 jam sejak pengajuan. Selama periode tersebut, satu eksemplar dikunci untuk anggota. Jika tidak diambil dalam 24 jam, reservasi otomatis kedaluwarsa dan stok dilepas kembali.",
  },
  {
    id: "masa-pinjam",
    question: "Kapan masa pinjam 7 hari mulai dihitung?",
    answer:
      "Masa pinjam 7 hari mulai dihitung setelah petugas perpustakaan mengonfirmasi bahwa buku telah diambil oleh anggota.",
  },
  {
    id: "keterlambatan",
    question: "Apakah ada denda keterlambatan?",
    answer:
      "Tidak ada denda uang. Anggota akan menerima pengingat melalui Email dan WhatsApp apabila masa pinjam mendekati atau melewati jatuh tempo.",
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
