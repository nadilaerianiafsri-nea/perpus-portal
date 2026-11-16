import { AdminBooksService } from './admin-books.service';
import type { PrismaService } from '../prisma/prisma.service';

const payload = {
  code: 'BK-TEST-LOKASI',
  title: 'Buku Contoh Lokasi',
  author: 'Penulis Uji',
  isbnIssn: '',
  publisher: 'Penerbit Uji',
  year: 2026,
  edition: '',
  language: 'Indonesia',
  subject: 'Umum',
  location: 'Ruang Baca A',
  shelf: 'A-01',
  totalStock: 0,
  description: 'Buku uji tanpa eksemplar',
  coverUrl: '/images/landing/book-placeholder-1.svg',
  isActive: true,
};

function setup() {
  const book = {
    id: 21,
    ...payload,
    isbnIssn: null,
    edition: null,
    type: 'FISIK',
    copies: [] as Array<{ id: number; location: string; status: string }>,
    reservations: [],
    loans: [],
  };
  const tx = {
    book: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        book.location = data.location as string;
        return { id: book.id };
      }),
      findFirst: jest.fn(async () => book),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        book.location = data.location as string;
        return book;
      }),
    },
    bookCopy: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(async () => []),
  };
  const prisma = {
    book: { findFirst: jest.fn(async () => book) },
    $transaction: jest.fn(async (handler: (transaction: typeof tx) => Promise<unknown>) => handler(tx)),
  };
  return { book, tx, prisma, service: new AdminBooksService(prisma as unknown as PrismaService) };
}

describe('Lokasi buku fisik tidak bergantung pada stok', () => {
  it('menyimpan lokasi pada books saat membuat buku dengan stok 0', async () => {
    const { service, tx } = setup();
    const result = await service.create(payload);

    expect(tx.book.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ location: 'Ruang Baca A' }) }),
    );
    expect(tx.bookCopy.createMany).not.toHaveBeenCalled();
    expect(result.book.location).toBe('Ruang Baca A');
  });

  it('menyimpan perubahan lokasi walaupun tidak ada eksemplar', async () => {
    const { service, tx } = setup();
    const result = await service.update('21', { ...payload, location: 'Gudang B' });

    expect(tx.book.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ location: 'Gudang B' }) }),
    );
    expect(tx.bookCopy.createMany).not.toHaveBeenCalled();
    expect(result.book.location).toBe('Gudang B');
  });

  it('detail memakai lokasi buku untuk stok 0 dan fallback untuk data lama', async () => {
    const { service, book } = setup();
    const current = await service.detail('21');
    expect(current.book.location).toBe('Ruang Baca A');

    // Data lama yang belum memiliki lokasi buku menggunakan lokasi eksemplar pertama.
    (book as { location: string | null }).location = null;
    book.copies.push({ id: 7, location: 'Lantai 2', status: 'TERSEDIA' });
    const legacy = await service.detail('21');
    expect(legacy.book.location).toBe('Lantai 2');
  });
});
