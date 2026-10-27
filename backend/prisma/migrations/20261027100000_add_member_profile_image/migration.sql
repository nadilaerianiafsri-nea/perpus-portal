-- Optional profile photo reference; existing members keep their initials.
ALTER TABLE `users` ADD COLUMN `profileImageUrl` VARCHAR(255) NULL;
