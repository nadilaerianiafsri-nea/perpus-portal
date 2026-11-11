
-- Portal Perpustakaan Kemenkum Riau
-- Sinkronisasi schema database dengan Prisma
-- Migrasi ini dijalankan satu kali melalui Prisma Migrate.

-- Tambahkan kolom katalog yang belum tersedia
ALTER TABLE `books`
    ADD COLUMN `accessDurationDays` INTEGER NULL,
    ADD COLUMN `accessMode` VARCHAR(64) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `licenseNote` TEXT NULL;

CREATE INDEX `books_type_isActive_idx`
    ON `books` (`type`, `isActive`);

-- Tambahkan kolom status pengguna
ALTER TABLE `users`
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- Buat tabel pembacaan notifikasi admin
CREATE TABLE `admin_notification_reads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NOT NULL,
    `notificationId` INTEGER NOT NULL,
    `readAt` DATETIME(3) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `admin_notification_reads_adminId_readAt_idx`
        (`adminId`, `readAt`),

    INDEX `admin_notification_reads_notificationId_idx`
        (`notificationId`),

    UNIQUE INDEX `admin_notification_reads_adminId_notificationId_key`
        (`adminId`, `notificationId`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Buat tabel rincian hibah
CREATE TABLE `book_grant_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grantId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `book_grant_items_grantId_idx`
        (`grantId`),

    INDEX `book_grant_items_title_idx`
        (`title`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Pindahkan judul dan jumlah hibah sebelum kolom lama dihapus
INSERT INTO `book_grant_items`
    (`grantId`, `title`, `quantity`, `createdAt`, `updatedAt`)
SELECT
    `id`,
    `title`,
    `quantity`,
    `createdAt`,
    `updatedAt`
FROM `book_grants`;

-- Tambahkan catatan hibah
ALTER TABLE `book_grants`
    ADD COLUMN `note` TEXT NULL;

-- Izinkan sementara status lama dan status baru
ALTER TABLE `book_grants`
    MODIFY COLUMN `status`
    ENUM(
        'MENUNGGU_VERIFIKASI',
        'SEDANG_DIPROSES',
        'SUDAH_DIKATALOGKAN',
        'BELUM_DIKATALOGKAN'
    ) NOT NULL
    DEFAULT 'BELUM_DIKATALOGKAN';

-- Sesuaikan status lama
UPDATE `book_grants`
SET `status` = 'BELUM_DIKATALOGKAN'
WHERE `status` IN (
    'MENUNGGU_VERIFIKASI',
    'SEDANG_DIPROSES'
);

-- Gunakan status akhir sesuai Prisma Schema
ALTER TABLE `book_grants`
    MODIFY COLUMN `status`
    ENUM(
        'BELUM_DIKATALOGKAN',
        'SUDAH_DIKATALOGKAN'
    ) NOT NULL
    DEFAULT 'BELUM_DIKATALOGKAN';

-- Hapus kolom lama setelah datanya dipindahkan
ALTER TABLE `book_grants`
    DROP COLUMN `quantity`,
    DROP COLUMN `title`;

-- Relasi notifikasi admin
ALTER TABLE `admin_notification_reads`
    ADD CONSTRAINT `admin_notification_reads_adminId_fkey`
    FOREIGN KEY (`adminId`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE `admin_notification_reads`
    ADD CONSTRAINT `admin_notification_reads_notificationId_fkey`
    FOREIGN KEY (`notificationId`)
    REFERENCES `notifications` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Relasi rincian hibah
ALTER TABLE `book_grant_items`
    ADD CONSTRAINT `book_grant_items_grantId_fkey`
    FOREIGN KEY (`grantId`)
    REFERENCES `book_grants` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
