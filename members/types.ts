export type MemberType = "UMUM" | "MAHASISWA" | "PEGAWAI" | null;
export interface MemberProfile {
  id: number; name: string; email: string; role: "PENGUNJUNG";
  memberType: MemberType; emailVerified: boolean;
  whatsapp: string; address: string; identityNumber: string;
  universityName: string | null; workUnit: string | null;
}
export interface MemberBook { id: number; title: string; code: string; coverUrl: string; author: string; type?: "FISIK" | "EBOOK"; }
export interface Reservation {
  id: number; status: "MENUNGGU_PENGAMBILAN" | "KEDALUWARSA" | "DIBATALKAN" | "DIAMBIL";
  createdAt: string; expiresAt: string; pickupLocation: string; book: MemberBook;
  copy: { id: number; code: string; status: "TERSEDIA" | "DIRESERVASI" | "DIPINJAM" | "HILANG" };
}
export interface Loan {
  lostReport?: import("./lostReport").LostReport | null;
  id: number; status: "AKTIF" | "DIKEMBALIKAN" | "HILANG";
  borrowedAt: string; dueAt: string; returnedAt: string | null;
  extensionCount: number; book: MemberBook; copy: { id: number; code: string };
}
export interface MemberNotification {
  id: number; title: string; message: string; createdAt: string; readAt: string | null; href: string;
  targetUrl?: string | null; entityType?: string | null; entityId?: number | null; bookId?: number | null;
}
export interface HistoryItem {
  id: number; sourceType: "LOAN" | "RESERVATION";
  bookId: number; title: string; bookCode: string; coverUrl: string; type: "FISIK";
  borrowedAt: string | null; reservedAt: string | null; returnedAt: string | null;
  completedAt: string | null; extensionCount: number;
  status: "DIKEMBALIKAN" | "KEDALUWARSA" | "DIBATALKAN";
}
export interface MemberEBook {
  id: number; bookId: number;
  book: MemberBook & { format: string; isActive?: boolean };
  addedAt: string; lastOpenedAt: string | null;
  progress: number; lastPosition: number; progressVersion: number;
}
export type EBookCirculationState =
  | "AVAILABLE"
  | "BORROWED_BY_ME"
  | "BORROWED_BY_OTHER"
  | "QUEUED"
  | "OFFERED_TO_ME"
  | "UNAVAILABLE";
export interface EBookCirculationStatus {
  state: EBookCirculationState;
  bookId: number;
  canBorrow: boolean;
  canQueue: boolean;
  activeBorrowerDueAt?: string | null;
  loan?: EBookLoan;
  queue?: EBookQueue;
}
export interface EBookLoan {
  id: number;
  status: "AKTIF" | "DIKEMBALIKAN" | "KEDALUWARSA";
  borrowedAt: string;
  dueAt: string;
  endedAt: string | null;
  bookId: number;
  book: MemberBook & { format: string; isActive?: boolean };
  reading?: MemberEBook | null;
}
export interface EBookQueue {
  id: number;
  status: "MENUNGGU" | "DITAWARKAN";
  bookId: number;
  book: MemberBook & { format: string; isActive?: boolean };
  queuedAt: string;
  offeredAt: string | null;
  claimExpiresAt: string | null;
  position: number | null;
}
export interface ReadEBookHistory extends MemberEBook {
  circulation: EBookCirculationStatus;
}
export interface MemberEBooksPayload {
  activeLoans: EBookLoan[];
  queues: EBookQueue[];
  readHistory: ReadEBookHistory[];
  ebooks: MemberEBook[];
}
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
