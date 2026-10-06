export type MemberType = "UMUM" | "MAHASISWA" | "PEGAWAI" | null;
export interface MemberProfile {
  id: number; name: string; email: string; role: "PENGUNJUNG";
  memberType: MemberType; emailVerified: boolean;
  whatsapp: string; address: string; identityNumber: string;
  universityName: string | null; workUnit: string | null;
}
export interface MemberBook { id: number; title: string; code: string; coverUrl: string; author: string; }
export interface Reservation {
  id: number; status: "MENUNGGU_PENGAMBILAN" | "KEDALUWARSA" | "DIBATALKAN" | "DIAMBIL";
  createdAt: string; expiresAt: string; pickupLocation: string; book: MemberBook;
  copy: { id: number; code: string; status: "TERSEDIA" | "DIRESERVASI" | "DIPINJAM" | "HILANG" };
}
export interface Loan {
  id: number; status: "AKTIF" | "DIKEMBALIKAN" | "HILANG";
  borrowedAt: string; dueAt: string; returnedAt: string | null;
  extensionCount: number; book: MemberBook; copy: { id: number; code: string };
}
export interface MemberNotification {
  id: number; title: string; message: string; createdAt: string; readAt: string | null; href: string;
}
export interface MemberEBook { id: number; book: MemberBook; addedAt: string; lastOpenedAt: string | null; }
export interface MemberSummary {
  currentUser: MemberProfile;
  stats: { waitingPickup: number; activeLoans: number; dueTomorrow: number; ebooks: number; history: number };
  activeReservations: Reservation[]; nearestDeadlines: Loan[];
  alerts: { overdue: Loan[]; lost: Loan[] }; unreadNotifications: number;
  reminders: { email: string; whatsapp: string };
}
export const memberTypeLabels: Record<Exclude<MemberType, null>, string> = {
  UMUM: "Masyarakat Umum", MAHASISWA: "Mahasiswa", PEGAWAI: "Pegawai Internal",
};
