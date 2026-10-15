-- Additive migration: E-Book circulation history and active queue.
-- Existing user_ebooks rows are intentionally left untouched so reading progress persists.

CREATE TABLE `ebook_loans` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `bookId` INTEGER NOT NULL,
  `activeBookId` INTEGER NULL,
  `status` ENUM('AKTIF', 'DIKEMBALIKAN', 'KEDALUWARSA') NOT NULL DEFAULT 'AKTIF',
  `borrowedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `dueAt` DATETIME(3) NOT NULL,
  `endedAt` DATETIME(3) NULL,

  UNIQUE INDEX `ebook_loans_activeBookId_key`(`activeBookId`),
  INDEX `ebook_loans_bookId_status_dueAt_idx`(`bookId`, `status`, `dueAt`),
  INDEX `ebook_loans_userId_status_dueAt_idx`(`userId`, `status`, `dueAt`),
  INDEX `ebook_loans_userId_bookId_borrowedAt_idx`(`userId`, `bookId`, `borrowedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ebook_queues` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `bookId` INTEGER NOT NULL,
  `activeKey` VARCHAR(191) NULL,
  `status` ENUM('MENUNGGU', 'DITAWARKAN', 'DIKLAIM', 'DIBATALKAN', 'KEDALUWARSA') NOT NULL DEFAULT 'MENUNGGU',
  `queuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `offeredAt` DATETIME(3) NULL,
  `claimExpiresAt` DATETIME(3) NULL,
  `claimedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `expiredAt` DATETIME(3) NULL,

  UNIQUE INDEX `ebook_queues_activeKey_key`(`activeKey`),
  INDEX `ebook_queues_bookId_status_queuedAt_id_idx`(`bookId`, `status`, `queuedAt`, `id`),
  INDEX `ebook_queues_userId_bookId_status_idx`(`userId`, `bookId`, `status`),
  INDEX `ebook_queues_status_claimExpiresAt_idx`(`status`, `claimExpiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ebook_loans`
  ADD CONSTRAINT `ebook_loans_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `ebook_loans_bookId_fkey`
  FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ebook_queues`
  ADD CONSTRAINT `ebook_queues_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `ebook_queues_bookId_fkey`
  FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
