// Seed development idempoten; tidak menyentuh data auth/katalog.
require('dotenv').config({ quiet: true });
const { PrismaService } = require('../dist/prisma/prisma.service');
const prisma = new PrismaService({ getOrThrow: key => {
  if (!process.env[key]) throw new Error(`${key} belum dikonfigurasi.`);
  return process.env[key];
} });
const examples = [
  ['Dasar Hukum Indonesia (Data Contoh)', 25, 'Komunitas Literasi Riau (Data Contoh)', '2026-02-14', 'SUDAH_DIKATALOGKAN'],
  ['Administrasi Publik (Data Contoh)', 10, 'Instansi Pendidikan (Data Contoh)', '2026-01-09', 'SEDANG_DIPROSES'],
  ['Sejarah Nusantara (Data Contoh)', 40, 'Najwa Putri (Data Contoh)', '2025-11-22', 'SUDAH_DIKATALOGKAN'],
  ['Literasi Digital (Data Contoh)', 8, 'Komunitas Pembaca (Data Contoh)', '2025-10-30', 'MENUNGGU_VERIFIKASI'],
  ['Referensi Ilmu Sosial (Data Contoh)', 15, 'Budi Santoso (Data Contoh)', '2025-06-05', 'SUDAH_DIKATALOGKAN'],
];
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed hibah hanya untuk development.');
  for (const [index, [title, quantity, donorName, date, status]] of examples.entries()) {
    await prisma.bookGrant.upsert({ where: { seedKey: `DEMO-GRANT-${index + 1}` }, update: {}, create: { title, quantity, donorName, receivedAt: new Date(`${date}T00:00:00Z`), status, isDemo: true, seedKey: `DEMO-GRANT-${index + 1}` } });
  }
  console.log(`Seed hibah selesai: ${await prisma.bookGrant.count({ where: { isDemo: true } })} record contoh.`);
}
main().catch(() => { console.error('Seed hibah gagal. Periksa konfigurasi database dan migration.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
