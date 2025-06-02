/*
  Warnings:

  - You are about to alter the column `price` on the `product` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `product` ADD COLUMN `transformation_workshop_fk` INTEGER NULL,
    MODIFY `price` DOUBLE NULL;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_transformation_workshop_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
