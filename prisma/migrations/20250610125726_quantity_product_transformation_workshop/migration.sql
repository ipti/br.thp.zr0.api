/*
  Warnings:

  - You are about to drop the `workshop_stock` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `quantity` to the `transformation_workshop_product` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `workshop_stock` DROP FOREIGN KEY `workshop_stock_product_fk_fkey`;

-- AlterTable
ALTER TABLE `transformation_workshop_product` ADD COLUMN `quantity` INTEGER NOT NULL;

-- DropTable
DROP TABLE `workshop_stock`;
