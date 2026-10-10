/*
  Warnings:

  - You are about to alter the column `password` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(200)` to `VarChar(100)`.
  - You are about to alter the column `bio` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(300)`.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `is_verified` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `name` VARCHAR(200) NOT NULL,
    MODIFY `password` VARCHAR(100) NOT NULL,
    MODIFY `bio` VARCHAR(300) NULL;
