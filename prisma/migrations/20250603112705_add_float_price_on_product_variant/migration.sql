/*
  Warnings:

  - You are about to alter the column `price` on the `product_variant` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `product_variant` MODIFY `price` DOUBLE NULL;
