-- Katalog baru; tabel auth tidak diubah.
CREATE TABLE `books` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `author` VARCHAR(191) NOT NULL,
  `isbnIssn` VARCHAR(64) NULL,
  `publisher` VARCHAR(191) NOT NULL,
  `year` INTEGER NOT NULL,
  `edition` VARCHAR(191) NULL,
  `language` VARCHAR(64) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `type` ENUM('FISIK', 'EBOOK') NOT NULL,
  `format` VARCHAR(64) NOT NULL,
  `description` TEXT NOT NULL,
  `coverUrl` VARCHAR(191) NOT NULL,
  `shelf` VARCHAR(191) NULL,
  `ebookUrl` VARCHAR(191) NULL,
  `isDemo` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `books_code_key` (`code`),
  INDEX `books_type_year_idx` (`type`, `year`),
  INDEX `books_language_idx` (`language`),
  INDEX `books_subject_idx` (`subject`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `book_copies` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `bookId` INTEGER NOT NULL,
  `code` VARCHAR(80) NOT NULL,
  `status` ENUM('TERSEDIA', 'DIRESERVASI', 'DIPINJAM') NOT NULL DEFAULT 'TERSEDIA',
  `location` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `book_copies_code_key` (`code`),
  INDEX `book_copies_bookId_status_idx` (`bookId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `book_copies` ADD CONSTRAINT `book_copies_bookId_fkey`
FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
