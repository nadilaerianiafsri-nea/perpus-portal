export type TopBorrowedCollection = { id: number; title: string; borrowCount: number };

export type DashboardActionRequired = {
  expiringReservations: number;
  overdueLoans: number;
  pendingLostBookReplacements: number;
  failedNotifications: number;
};

export type DashboardInsightsData = {
  topBorrowedCollections: TopBorrowedCollection[] | null;
  actionRequired: DashboardActionRequired | null;
};

export function dashboardActionItems(counts: DashboardActionRequired) {
  return [
    { key: "reservations", count: counts.expiringReservations, label: "reservasi mendekati batas pengambilan", detail: "Sisa waktu pengambilan maksimal 2 jam", href: "/admin/transaksi/reservasi?status=MENUNGGU_PENGAMBILAN", tone: "warning", icon: "clock" },
    { key: "overdue", count: counts.overdueLoans, label: "peminjaman melewati jatuh tempo", detail: "Pinjaman aktif yang belum dikembalikan", href: "/admin/transaksi/terlambat", tone: "danger", icon: "alert" },
    { key: "lost", count: counts.pendingLostBookReplacements, label: "buku hilang perlu ditangani", detail: "Tindak lanjuti melalui pengelolaan buku hilang", href: "/admin/transaksi/buku-hilang-penggantian?status=PROCESS", tone: "coral", icon: "box" },
    { key: "notifications", count: counts.failedNotifications, label: "pengiriman email gagal", detail: "Periksa status pengiriman pada halaman Notifikasi", href: "/admin/notifikasi", tone: "info", icon: "bell" },
  ].filter(item => item.count > 0);
}
