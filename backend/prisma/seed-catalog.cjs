// Data development; tidak mengubah pengguna atau seed auth.
require('dotenv').config({ quiet: true });
const { PrismaClient, CollectionType, CopyStatus } = require('../dist/generated/prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const url = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), connectionLimit: 5 }) });
const subjects = ['Hukum & Perundang-undangan', 'Administrasi Publik', 'Sosial & Politik', 'Ekonomi', 'Teknologi Informasi', 'Sejarah', 'Referensi Umum', 'Karya Ilmiah'];
const titles = ['Dasar Hukum dan Perundang-undangan', 'Pelayanan Publik yang Inklusif', 'Masyarakat dan Kebijakan Sosial', 'Pengantar Ekonomi Indonesia', 'Transformasi Digital Pemerintahan', 'Sejarah Hukum Nusantara', 'Panduan Literasi Informasi', 'Metode Penelitian Ilmiah'];
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed contoh hanya untuk development.');
  for (let i = 0; i < 20; i++) {
    const ebook = i >= 12;
    const code = `DEMO-${ebook ? 'EB' : 'BK'}-${String(i + 1).padStart(4, '0')}`;
    const existing = await prisma.book.findUnique({ where: { code } });
    // Idempoten: jangan menimpa koleksi yang sudah ada atau telah diedit.
    if (existing) continue;
    await prisma.book.create({ data: {
      code, title: `${titles[i % 8]}${i < 8 ? '' : `, Jilid ${Math.floor(i / 8) + 1}`} (Data Contoh)`,
      author: ['Tim Literasi Riau', 'Najwa Putri', 'Budi Santoso', 'Siti Rahma'][i % 4],
      isbnIssn: `DEMO-ISBN-${String(i + 1).padStart(5, '0')}`, publisher: 'Penerbit Contoh Perpustakaan', year: 2018 + (i % 9), edition: 'Edisi 1',
      language: ['Indonesia', 'Inggris', 'Arab'][i % 3], subject: subjects[i % 8], type: ebook ? CollectionType.EBOOK : CollectionType.FISIK,
      format: ebook ? 'HTML (bacaan contoh)' : 'Buku cetak', description: 'Data contoh untuk pengembangan katalog Perpustakaan Kemenkum Riau. Metadata dan isi ini digunakan untuk demonstrasi antarmuka, bukan publikasi resmi.',
      coverUrl: `/images/landing/book-placeholder-${i % 4 + 1}.svg`, shelf: ebook ? null : `Rak ${String.fromCharCode(65 + i % 4)}-${i % 3 + 1}`,
      ebookUrl: ebook ? '/ebooks/contoh-literasi.html' : null, isDemo: true,
      ...(!ebook ? { copies: { create: [0, 1].map(n => ({ code: `${code}-E${n + 1}`, status: i % 5 === 4 ? CopyStatus.DIPINJAM : i % 5 === 3 ? CopyStatus.DIRESERVASI : n === 0 ? CopyStatus.TERSEDIA : CopyStatus.DIPINJAM, location: `Rak ${String.fromCharCode(65 + i % 4)}-${i % 3 + 1}` })) } } : {}),
    } });
  }
  console.log(`Seed selesai: ${await prisma.book.count({ where: { isDemo: true } })} koleksi contoh tersimpan.`);
}
main().catch(() => { console.error('Seed katalog gagal. Periksa database dan migration.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
