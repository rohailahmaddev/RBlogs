/*
  Warnings:

  - You are about to drop the `contactMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `posts` MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `updated_at` DATETIME(3) NULL;

-- DropTable
DROP TABLE `contactMessage`;

-- CreateTable
CREATE TABLE `contactmessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
