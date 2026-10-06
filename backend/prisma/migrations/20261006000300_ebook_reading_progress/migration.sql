-- Persist reading on the existing member library; preserve all existing rows.
ALTER TABLE `user_ebooks` ADD COLUMN `lastPosition` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `progress` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `progressVersion` INTEGER NOT NULL DEFAULT 0;
