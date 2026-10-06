-- AlterTable
ALTER TABLE `book_copies` MODIFY `status` ENUM('TERSEDIA', 'DIRESERVASI', 'DIPINJAM', 'HILANG') NOT NULL DEFAULT 'TERSEDIA';

-- CreateTable
CREATE TABLE `reservations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bookId` INTEGER NOT NULL,
    `copyId` INTEGER NOT NULL,
    `status` ENUM('MENUNGGU_PENGAMBILAN', 'KEDALUWARSA', 'DIBATALKAN', 'DIAMBIL') NOT NULL DEFAULT 'MENUNGGU_PENGAMBILAN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,

    INDEX `reservations_userId_status_bookId_idx`(`userId`, `status`, `bookId`),
    INDEX `reservations_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `reservations_copyId_idx`(`copyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bookId` INTEGER NOT NULL,
    `copyId` INTEGER NOT NULL,
    `reservationId` INTEGER NOT NULL,
    `status` ENUM('AKTIF', 'DIKEMBALIKAN', 'HILANG') NOT NULL DEFAULT 'AKTIF',
    `borrowedAt` DATETIME(3) NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `returnedAt` DATETIME(3) NULL,
    `extensionCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `loans_reservationId_key`(`reservationId`),
    INDEX `loans_userId_status_dueAt_idx`(`userId`, `status`, `dueAt`),
    INDEX `loans_status_dueAt_idx`(`status`, `dueAt`),
    INDEX `loans_copyId_idx`(`copyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_extensions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loanId` INTEGER NOT NULL,
    `previousDueAt` DATETIME(3) NOT NULL,
    `newDueAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loan_extensions_loanId_createdAt_idx`(`loanId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `eventKey` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `href` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,
    `emailDelivery` ENUM('NOT_REQUIRED', 'PENDING', 'SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'NOT_REQUIRED',
    `emailAttempts` INTEGER NOT NULL DEFAULT 0,
    `emailAttemptedAt` DATETIME(3) NULL,
    `emailSentAt` DATETIME(3) NULL,
    `whatsappDelivery` VARCHAR(32) NOT NULL DEFAULT 'NOT_REQUIRED',

    UNIQUE INDEX `notifications_eventKey_key`(`eventKey`),
    INDEX `notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    INDEX `notifications_emailDelivery_emailAttemptedAt_idx`(`emailDelivery`, `emailAttemptedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_ebooks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bookId` INTEGER NOT NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastOpenedAt` DATETIME(3) NULL,

    INDEX `user_ebooks_userId_addedAt_idx`(`userId`, `addedAt`),
    UNIQUE INDEX `user_ebooks_userId_bookId_key`(`userId`, `bookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_copyId_fkey` FOREIGN KEY (`copyId`) REFERENCES `book_copies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_copyId_fkey` FOREIGN KEY (`copyId`) REFERENCES `book_copies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_extensions` ADD CONSTRAINT `loan_extensions_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ebooks` ADD CONSTRAINT `user_ebooks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_ebooks` ADD CONSTRAINT `user_ebooks_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
