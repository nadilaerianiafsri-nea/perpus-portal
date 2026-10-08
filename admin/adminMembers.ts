export type AdminMemberType = "UMUM" | "MAHASISWA" | "PEGAWAI";

export type AdminMemberListItem = {
  id: number;
  name: string;
  email: string;
  memberType: AdminMemberType | null;
  emailVerified: boolean;
  isActive: boolean;
  whatsapp: string;
  activeLoans: number;
  overdue: number;
  createdAt: string;
};

export type AdminMembersResponse = {
  stats: {
    total: number;
    umum: number;
    mahasiswa: number;
    pegawai: number;
  };
  data: AdminMemberListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminMemberLoan = {
  id: number;
  status: "AKTIF" | "DIKEMBALIKAN" | "HILANG";
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  extensionCount: number;
  book: {
    id: number;
    code: string;
    title: string;
  };
  copy: {
    code: string;
  };
};

export type AdminMemberReservation = {
  id: number;
  status: "MENUNGGU_PENGAMBILAN" | "KEDALUWARSA" | "DIBATALKAN" | "DIAMBIL";
  createdAt: string;
  expiresAt: string;
  book: {
    id: number;
    code: string;
    title: string;
  };
  copy: {
    code: string;
  };
};

export type AdminMemberDetailResponse = {
  member: {
    id: number;
    name: string;
    email: string;
    memberType: AdminMemberType | null;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    profile: {
      whatsapp: string;
      address: string;
      identityNumber: string;
      universityName: string | null;
      workUnit: string | null;
    } | null;
  };
  summary: {
    activeLoans: number;
    overdue: number;
    activeReservations: number;
    completedLoans: number;
  };
  activeLoans: AdminMemberLoan[];
  activeReservations: AdminMemberReservation[];
  history: AdminMemberLoan[];
};

export function memberTypeLabel(type: AdminMemberType | null) {
  switch (type) {
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

export function formatAdminMemberDate(value: string | Date | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

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

export function formatAdminMemberDateTime(value: string | Date | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

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

export async function adminMemberApiMessage(
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
