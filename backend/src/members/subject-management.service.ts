import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SubjectRow = {
  // Prisma $queryRaw mengembalikan INT UNSIGNED sebagai BigInt.
  id: number | bigint;
  name: string;
  createdAt: Date;
  usageCount: bigint | number;
};

function validateName(input: unknown): string {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => key !== 'name') ||
    typeof (input as { name?: unknown }).name !== 'string'
  ) {
    throw new BadRequestException('Nama subjek/kategori tidak valid.');
  }
  const name = (input as { name: string }).name.trim().replace(/\s+/g, ' ');
  if (
    name.length < 2 ||
    name.length > 100 ||
    /[<>\u0000-\u001f\u007f]/.test((input as { name: string }).name)
  ) {
    throw new BadRequestException('Nama kategori harus 2–100 karakter dan tidak boleh berisi HTML.');
  }
  return name;
}

function validateId(raw: string): number {
  if (!/^\d+$/.test(raw)) throw new BadRequestException('ID kategori tidak valid.');
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw new BadRequestException('ID kategori tidak valid.');
  }
  return id;
}

@Injectable()
export class SubjectManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.$queryRaw<SubjectRow[]>`
      SELECT s.id, s.name, s.createdAt,
        (SELECT COUNT(*) FROM books b WHERE b.subject = s.name) AS usageCount
      FROM collection_subjects s
      ORDER BY s.createdAt DESC, s.id DESC
    `;
    return {
      categories: rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        createdAt: row.createdAt,
        usageCount: Number(row.usageCount),
      })),
    };
  }

  async publicList() {
    const result = await this.list();
    return { subjects: result.categories.map(({ name }) => name) };
  }

  async add(input: unknown) {
    const name = validateName(input);
    const duplicate = await this.prisma.$queryRaw<{ id: number | bigint }[]>`
      SELECT id FROM collection_subjects WHERE name = ${name} LIMIT 1
    `;
    if (duplicate.length) {
      throw new ConflictException('Subjek/kategori sudah terdaftar. Pilih kategori yang tersedia.');
    }
    try {
      await this.prisma.$executeRaw`
        INSERT INTO collection_subjects (name) VALUES (${name})
      `;
    } catch (error) {
      // Simultaneous requests may race on the unique name constraint.
      const competing = await this.prisma.$queryRaw<{ id: number | bigint }[]>`
        SELECT id FROM collection_subjects WHERE name = ${name} LIMIT 1
      `;
      if (competing.length) {
        throw new ConflictException('Subjek/kategori sudah terdaftar. Pilih kategori yang tersedia.');
      }
      throw error;
    }
    const result = await this.prisma.$queryRaw<{ id: number | bigint; name: string }[]>`
      SELECT id, name FROM collection_subjects WHERE name = ${name} LIMIT 1
    `;
    return { category: { id: Number(result[0].id), name: result[0].name } };
  }

  async remove(rawId: string) {
    const id = validateId(rawId);
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: number | bigint; name: string }[]>`
        SELECT id, name FROM collection_subjects WHERE id = ${id} FOR UPDATE
      `;
      const row = rows[0];
      if (!row) throw new NotFoundException('Subjek/kategori tidak ditemukan.');
      const counts = await tx.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total FROM books WHERE subject = ${row.name}
      `;
      if (Number(counts[0]?.total ?? 0) > 0) {
        throw new ConflictException(
          'Kategori masih digunakan oleh buku fisik atau e-book. Pindahkan kategorinya terlebih dahulu.',
        );
      }
      await tx.$executeRaw`DELETE FROM collection_subjects WHERE id = ${id}`;
    });
    return { message: 'Subjek/kategori berhasil dihapus.' };
  }
}
