import type {
  EBookLoan,
  EBookQueue,
  MemberEBook,
  MemberEBooksPayload,
  ReadEBookHistory,
} from "./types";

type PartialPayload = Partial<MemberEBooksPayload> & {
  ebooks?: MemberEBook[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayField<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeMemberEBooksPayload(payload: unknown): {
  activeLoans: EBookLoan[];
  queues: EBookQueue[];
  readHistory: ReadEBookHistory[];
} {
  const source: PartialPayload = isRecord(payload)
    ? (payload as PartialPayload)
    : {};

  const activeLoans = arrayField<EBookLoan>(source.activeLoans);
  const queues = arrayField<EBookQueue>(source.queues);
  const currentHistory = arrayField<ReadEBookHistory>(source.readHistory);

  if (currentHistory.length || Array.isArray(source.readHistory)) {
    return { activeLoans, queues, readHistory: currentHistory };
  }

  const legacyReadings = arrayField<MemberEBook>(source.ebooks)
    .filter((ebook) => Boolean(ebook?.lastOpenedAt))
    .map<ReadEBookHistory>((ebook) => ({
      ...ebook,
      circulation: {
        state: "UNAVAILABLE",
        bookId: ebook.bookId,
        canBorrow: false,
        canQueue: false,
      },
    }));

  return { activeLoans, queues, readHistory: legacyReadings };
}
