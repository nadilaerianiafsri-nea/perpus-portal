import "dotenv/config";

import bcrypt from "bcrypt";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import {
  MemberType,
  PrismaClient,
  Role,
} from "../generated/prisma/client";

function createAdapter() {
  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL belum tersedia di backend/.env",
    );
  }

  const url = new URL(databaseUrl);

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(
      url.username,
    ),
    password: decodeURIComponent(
      url.password,
    ),
    database: url.pathname.replace(
      /^\//,
      "",
    ),
    connectionLimit: 5,
  });
}

function requiredPassword(
  name: string,
) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} belum diisi di backend/.env`,
    );
  }

  return value;
}

const prisma = new PrismaClient({
  adapter: createAdapter(),
});

async function main() {
  const users = [
    {
      name: "Admin Perpustakaan",
      email: "admin@perpus.local",
      password: requiredPassword(
        "SEED_ADMIN_PASSWORD",
      ),
      role: Role.ADMIN,
      memberType: null,
    },

    {
      name: "Pengunjung 1",
      email:
        "pengunjung1@perpus.local",
      password: requiredPassword(
        "SEED_PENGUNJUNG1_PASSWORD",
      ),
      role: Role.PENGUNJUNG,
      memberType: MemberType.UMUM,
    },

    {
      name: "Pengunjung 2",
      email:
        "pengunjung2@perpus.local",
      password: requiredPassword(
        "SEED_PENGUNJUNG2_PASSWORD",
      ),
      role: Role.PENGUNJUNG,
      memberType:
        MemberType.MAHASISWA,
    },

    {
      name: "Pengunjung 3",
      email:
        "pengunjung3@perpus.local",
      password: requiredPassword(
        "SEED_PENGUNJUNG3_PASSWORD",
      ),
      role: Role.PENGUNJUNG,
      memberType:
        MemberType.PEGAWAI,
    },
  ];

  for (const user of users) {
    const passwordHash =
      await bcrypt.hash(
        user.password,
        12,
      );

    await prisma.user.upsert({
      where: {
        email: user.email,
      },

      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        memberType:
          user.memberType,
      },

      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        memberType:
          user.memberType,
      },
    });
  }

  console.log(
    "4 akun development berhasil disiapkan: 1 ADMIN + 3 PENGUNJUNG.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });