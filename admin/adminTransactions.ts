export type MemberType = "UMUM" | "MAHASISWA" | "PEGAWAI";

export type TransactionMember = {
  id: number;
  name: string;
  email: string;
  memberType: MemberType | null;
  whatsapp: string;
};

export type TransactionBook = {
  id: number;
  code: string;
  title: string;
  coverUrl: string;
};

export type ReservationRow = {
  id: number;
  status: "MENUNGGU_PENGAMBILAN" | "KEDALUWARSA" | "DIBATALKAN" | "DIAMBIL";
  createdAt: string;
  expiresAt: string;
  pickedUpAt: string | null;
  cancelledAt: string | null;
  member: TransactionMember;
  book: TransactionBook;
  copy: {
    id: number;
    code: string;
  };
};

export type ReservationsResponse = {
  stats: {
    waiting: number;
    almostExpired: number;
    expired: number;
    pickedUp: number;
  };
  data: ReservationRow[];
  meta: PageMeta;
};

export type LoanRow = {
  id: number;
  status: "AKTIF";
  borrowedAt: string;
  dueAt: string;
  extensionCount: number;
  member: TransactionMember;
  book: TransactionBook;
  copy: {
    id: number;
    code: string;
  };
};

export type EbookAccessRow = {
  id: number;
  addedAt: string;
  lastOpenedAt: string | null;
  endsAt: string | null;
  progress: number;
  member: TransactionMember;
  book: {
    id: number;
    code: string;
    title: string;
  };
};

export type LoansResponse = {
  stats: {
    physicalActive: number;
    ebookActive: number;
    dueSoon: number;
    overdue: number;
  };
  data: LoanRow[];
  ebooks: EbookAccessRow[];
  meta: PageMeta;
};

export type ReturnsResponse = {
  stats: {
    active: number;
    dueToday: number;
    overdue: number;
    returnedToday: number;
  };
  data: LoanRow[];
  meta: PageMeta;
};

export type LostLoanRow = {
  id: number;
  borrowedAt: string;
  dueAt: string;
  extensionCount: number;
  member: TransactionMember;
  book: TransactionBook;
  copy: {
    id: number;
    code: string;
  };
};

export type LostBooksResponse = {
  stats: {
    total: number;
    affectedMembers: number;
    extended: number;
  };
  data: LostLoanRow[];
  meta: PageMeta;
};

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function memberTypeLabel(value: MemberType | null) {
  switch (value) {
    case "UMUM":
      return "Masyarakat Umum";
    case "MAHASISWA":
      return "Mahasiswa";
    case "PEGAWAI":
      return "Pegawai Internal";
    default:
      return "-";
  }
}

export function transactionId(id: number, prefix = "TRX") {
  return `${prefix}-${String(id).padStart(5, "0")}`;
}

export function formatTransactionDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatTransactionDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function physicalLoanStatus(dueAt: string) {
  const now = Date.now();
  const due = new Date(dueAt).getTime();

  if (due < now) {
    return "TERLAMBAT";
  }

  if (due - now <= 24 * 60 * 60 * 1000) {
    return "JATUH_TEMPO";
  }

  return "AKTIF";
}

export function normalizeWhatsapp(whatsapp: string) {
  const digits = whatsapp.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

export function whatsappReminderHref(
  member: TransactionMember,
  book: TransactionBook,
  dueAt: string,
) {
  const phone = normalizeWhatsapp(member.whatsapp);

  if (!phone) {
    return "";
  }

  const message = [
    `Halo ${member.name},`,
    "",
    `Pengingat peminjaman buku "${book.title}" di Perpustakaan Kemenkum Riau.`,
    `Jatuh tempo: ${formatTransactionDateTime(dueAt)}.`,
    "",
    "Mohon mengembalikan atau melakukan perpanjangan sesuai ketentuan yang berlaku.",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export async function transactionApiMessage(
  response: Response,
  fallback: string,
) {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(", ");
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Respons bukan JSON.
  }

  return fallback;
}
