-- Extend the existing loan; preserve all loan/copy data and legacy lost cases.
ALTER TABLE `loans`
    ADD COLUMN `lostReportStatus` ENUM('MENUNGGU_VERIFIKASI', 'PROSES_PENGGANTIAN', 'SELESAI') NULL,
    ADD COLUMN `lostReportSource` ENUM('ANGGOTA', 'ADMIN') NULL,
    ADD COLUMN `lostReportedAt` DATETIME(3) NULL,
    ADD COLUMN `lostVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `lostResolvedAt` DATETIME(3) NULL;

CREATE INDEX `loans_lostReportStatus_lostReportedAt_idx` ON `loans`(`lostReportStatus`, `lostReportedAt`);
