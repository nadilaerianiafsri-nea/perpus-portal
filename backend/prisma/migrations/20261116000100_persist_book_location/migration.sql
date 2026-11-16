-- Pertahankan lokasi buku fisik meskipun stok buku nol.
-- Kolom baru opsional karena jenis EBOOK tidak memerlukan lokasi rak.
ALTER TABLE `books`
    ADD COLUMN `location` VARCHAR(191) NULL;

-- Salin lokasi lama dari eksemplar pertama (sesuai perilaku halaman detail sebelumnya).
-- Buku dengan stok 0 tidak memiliki sumber lokasi; nilainya tetap NULL sampai diedit admin.
UPDATE `books` AS b
SET b.`location` = (
    SELECT c.`location`
    FROM `book_copies` AS c
    WHERE c.`bookId` = b.`id`
    ORDER BY c.`id` ASC
    LIMIT 1
)
WHERE b.`type` = 'FISIK'
  AND b.`location` IS NULL
  AND EXISTS (
      SELECT 1
      FROM `book_copies` AS c2
      WHERE c2.`bookId` = b.`id`
  );
