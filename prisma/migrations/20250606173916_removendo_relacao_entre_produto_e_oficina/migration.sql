/*
  Warnings:

  - You are about to drop the column `transformation_workshop_fk` on the `product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `product_transformation_workshop_fk_fkey`;

-- DropIndex
DROP INDEX `product_transformation_workshop_fk_fkey` ON `product`;

-- AlterTable
ALTER TABLE `product` DROP COLUMN `transformation_workshop_fk`;
