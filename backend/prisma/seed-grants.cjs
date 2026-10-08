// Seed development idempoten; tidak menyentuh data auth/katalog.
require('dotenv').config({ quiet: true });

const { PrismaService } = require('../dist/prisma/prisma.service');

const prisma = new PrismaService({
  getOrThrow: (key) => {
    if (!process.env[key]) {
      throw new Error(`${key} belum dikonfigurasi.`);
    }

    return process.env[key];
  },
});

const examples = [
  {
    donorName: 'Komunitas Literasi Riau (Data Contoh)',
    date: '2026-02-14',
    status: 'SUDAH_DIKATALOGKAN',
    items: [
      ['Dasar Hukum Indonesia (Data Contoh)', 25],
      ['Pengantar Hukum Nasional (Data Contoh)', 8],
    ],
  },
  {
    donorName: 'Instansi Pendidikan (Data Contoh)',
    date: '2026-01-09',
    status: 'BELUM_DIKATALOGKAN',
    items: [['Administrasi Publik (Data Contoh)', 10]],
  },
  {
    donorName: 'Najwa Putri (Data Contoh)',
    date: '2025-11-22',
    status: 'SUDAH_DIKATALOGKAN',
    items: [['Sejarah Nusantara (Data Contoh)', 40]],
  },
  {
    donorName: 'Komunitas Pembaca (Data Contoh)',
    date: '2025-10-30',
    status: 'BELUM_DIKATALOGKAN',
    items: [
      ['Literasi Digital (Data Contoh)', 8],
      ['Etika Digital (Data Contoh)', 4],
    ],
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed hibah hanya untuk development.');
  }

  for (let index = 0; index < examples.length; index += 1) {
    const example = examples[index];
    const seedKey = `DEMO-GRANT-${index + 1}`;

    const grant = await prisma.bookGrant.upsert({
      where: {
        seedKey,
      },
      update: {},
      create: {
        donorName: example.donorName,
        receivedAt: new Date(`${example.date}T00:00:00.000Z`),
        status: example.status,
        isDemo: true,
        seedKey,
      },
      select: {
        id: true,
      },
    });

    const itemCount = await prisma.bookGrantItem.count({
      where: {
        grantId: grant.id,
      },
    });

    if (itemCount === 0) {
      await prisma.bookGrantItem.createMany({
        data: example.items.map(([title, quantity]) => ({
          grantId: grant.id,
          title,
          quantity,
        })),
      });
    }
  }

  console.log(
    `Seed hibah selesai: ${await prisma.bookGrant.count({
      where: {
        isDemo: true,
      },
    })} penerimaan contoh.`,
  );
}

main()
  .catch(() => {
    console.error('Seed hibah gagal. Periksa konfigurasi database dan schema.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
