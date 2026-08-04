-- DropForeignKey
ALTER TABLE `cartitem` DROP FOREIGN KEY `cartItem_cart_fk_fkey`;

-- DropForeignKey
ALTER TABLE `cartitem` DROP FOREIGN KEY `cartItem_product_fk_fkey`;

-- DropForeignKey
ALTER TABLE `cartitem` DROP FOREIGN KEY `cartItem_variant_fk_fkey`;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `sale_type` ENUM('PRONTA_ENTREGA', 'ENCOMENDA') NOT NULL DEFAULT 'PRONTA_ENTREGA',
    ADD COLUMN `simulation_mode` ENUM('COST', 'DEADLINE') NULL;

-- AlterTable
ALTER TABLE `order_service` ADD COLUMN `estimated_delivery_at` DATETIME(3) NULL,
    ADD COLUMN `estimated_ready_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `production` ADD COLUMN `order_item_fk` INTEGER NULL,
    ADD COLUMN `production_status` ENUM('QUEUED', 'IN_PROGRESS', 'DONE', 'CANCELLED') NULL;

-- DropTable
DROP TABLE `_unused_dms_persistent_objects`;

-- DropTable
DROP TABLE `cartitem`;

-- CreateTable
CREATE TABLE `cartItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cart_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `variant_fk` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_capacity` (
    `transformation_workshop_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `monthly_capacity` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `production_capacity_transformation_workshop_fk_product_fk_key`(`transformation_workshop_fk`, `product_fk`),
    PRIMARY KEY (`transformation_workshop_fk`, `product_fk`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_reservation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_fk` INTEGER NOT NULL,
    `transformation_workshop_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `user_fk` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `order_fk` INTEGER NULL,
    `estimated_ready_at` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `production_reservation_product_fk_transformation_workshop_fk_idx`(`product_fk`, `transformation_workshop_fk`),
    INDEX `production_reservation_user_fk_idx`(`user_fk`),
    INDEX `production_reservation_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `production_order_item_fk_key` ON `production`(`order_item_fk`);

-- AddForeignKey
ALTER TABLE `production` ADD CONSTRAINT `production_order_item_fk_fkey` FOREIGN KEY (`order_item_fk`) REFERENCES `order_item`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cartItem` ADD CONSTRAINT `cartItem_variant_fk_fkey` FOREIGN KEY (`variant_fk`) REFERENCES `product_variant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cartItem` ADD CONSTRAINT `cartItem_cart_fk_fkey` FOREIGN KEY (`cart_fk`) REFERENCES `cart`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cartItem` ADD CONSTRAINT `cartItem_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_capacity` ADD CONSTRAINT `production_capacity_transformation_workshop_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_capacity` ADD CONSTRAINT `production_capacity_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_reservation` ADD CONSTRAINT `production_reservation_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_reservation` ADD CONSTRAINT `production_reservation_transformation_workshop_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_reservation` ADD CONSTRAINT `production_reservation_user_fk_fkey` FOREIGN KEY (`user_fk`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_reservation` ADD CONSTRAINT `production_reservation_order_fk_fkey` FOREIGN KEY (`order_fk`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

