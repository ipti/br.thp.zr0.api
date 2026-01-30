/*
  Warnings:

  - You are about to drop the column `status` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `workshop_fk` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `order_fk` on the `order_item` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `order_workshop_fk_fkey`;

-- DropForeignKey
ALTER TABLE `order_item` DROP FOREIGN KEY `order_item_order_fk_fkey`;

-- DropIndex
DROP INDEX `order_workshop_fk_fkey` ON `order`;

-- DropIndex
DROP INDEX `order_item_order_fk_fkey` ON `order_item`;

-- AlterTable
ALTER TABLE `order` DROP COLUMN `status`,
    DROP COLUMN `workshop_fk`;

-- AlterTable
ALTER TABLE `order_item` DROP COLUMN `order_fk`,
    ADD COLUMN `order_service_fk` INTEGER NULL;

-- CreateTable
CREATE TABLE `order_service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `transformation_workshop_fk` INTEGER NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'SOLITED_CANCELLATION') NOT NULL DEFAULT 'PENDING',
    `total_amount` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `order_fk` INTEGER NULL,

    UNIQUE INDEX `order_service_uid_key`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_service` ADD CONSTRAINT `order_service_transformation_workshop_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_service` ADD CONSTRAINT `order_service_order_fk_fkey` FOREIGN KEY (`order_fk`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_order_service_fk_fkey` FOREIGN KEY (`order_service_fk`) REFERENCES `order_service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
