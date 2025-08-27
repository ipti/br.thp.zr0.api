/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `order` will be added. If there are existing duplicate values, this will fail.
  - The required column `uid` was added to the `order` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE `order` ADD COLUMN `uid` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `order_uid_key` ON `order`(`uid`);
