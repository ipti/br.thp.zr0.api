-- AlterTable
ALTER TABLE `category`
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `order_service`
    ADD COLUMN `tracking_carrier` VARCHAR(191) NULL,
    ADD COLUMN `tracking_code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product`
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `transformation_workshop`
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `stock_reservation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_fk` INTEGER NOT NULL,
    `transformation_workshop_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `user_fk` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `order_fk` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_reservation_product_fk_transformation_workshop_fk_idx`(`product_fk`, `transformation_workshop_fk`),
    INDEX `stock_reservation_user_fk_idx`(`user_fk`),
    INDEX `stock_reservation_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
);

-- AddForeignKey
ALTER TABLE `stock_reservation`
    ADD CONSTRAINT `stock_reservation_product_fk_fkey`
    FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_reservation`
    ADD CONSTRAINT `stock_reservation_transformation_workshop_fk_fkey`
    FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_reservation`
    ADD CONSTRAINT `stock_reservation_user_fk_fkey`
    FOREIGN KEY (`user_fk`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_reservation`
    ADD CONSTRAINT `stock_reservation_order_fk_fkey`
    FOREIGN KEY (`order_fk`) REFERENCES `order`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
