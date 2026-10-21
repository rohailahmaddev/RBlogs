/*
  Warnings:

  - You are about to drop the column `notity_at` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `posts` DROP COLUMN `notity_at`,
    ADD COLUMN `notify_at` DATETIME(3) NULL;
