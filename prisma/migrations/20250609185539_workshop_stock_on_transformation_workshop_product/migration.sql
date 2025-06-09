/*
  Warnings:

  - You are about to drop the column `product_fk` on the `workshop_stock` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `workshop_stock` DROP FOREIGN KEY `workshop_stock_product_fk_fkey`;

-- DropIndex
DROP INDEX `workshop_stock_product_fk_fkey` ON `workshop_stock`;

-- AlterTable
ALTER TABLE `transformation_workshop_product` ADD COLUMN `workshop_stock_fk` INTEGER NULL;

-- AlterTable
ALTER TABLE `workshop_stock` DROP COLUMN `product_fk`;

-- AddForeignKey
ALTER TABLE `transformation_workshop_product` ADD CONSTRAINT `transformation_workshop_product_workshop_stock_fk_fkey` FOREIGN KEY (`workshop_stock_fk`) REFERENCES `workshop_stock`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
