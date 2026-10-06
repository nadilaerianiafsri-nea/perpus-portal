-- Informasi hibah yang telah diterima; tidak mengubah tabel existing.
CREATE TABLE `book_grants` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `donorName` VARCHAR(191) NOT NULL,
  `receivedAt` DATE NOT NULL,
  `status` ENUM('MENUNGGU_VERIFIKASI', 'SEDANG_DIPROSES', 'SUDAH_DIKATALOGKAN') NOT NULL DEFAULT 'MENUNGGU_VERIFIKASI',
  `isDemo` BOOLEAN NOT NULL DEFAULT false,
  `seedKey` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `book_grants_seedKey_key` (`seedKey`),
  INDEX `book_grants_status_receivedAt_idx` (`status`, `receivedAt`),
  INDEX `book_grants_receivedAt_idx` (`receivedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
