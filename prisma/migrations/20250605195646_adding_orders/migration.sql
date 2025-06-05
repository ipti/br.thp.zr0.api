-- CreateTable
CREATE TABLE `transformation_workshop_product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `transformation_workshop_fk` INTEGER NULL,
    `product_fk` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_image` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `img_url` VARCHAR(191) NULL,
    `order` INTEGER NULL,
    `product_fk` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_fk` INTEGER NOT NULL,
    `workshop_fk` INTEGER NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `total_amount` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `payment_status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `payment_method` ENUM('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_SLIP', 'CASH') NULL,
    `notes` VARCHAR(500) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `variant_fk` INTEGER NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DOUBLE NOT NULL,
    `total_price` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transformation_workshop_product` ADD CONSTRAINT `transformation_workshop_product_transformation_workshop_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transformation_workshop_product` ADD CONSTRAINT `transformation_workshop_product_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_image` ADD CONSTRAINT `product_image_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_user_fk_fkey` FOREIGN KEY (`user_fk`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_workshop_fk_fkey` FOREIGN KEY (`workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_order_fk_fkey` FOREIGN KEY (`order_fk`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_variant_fk_fkey` FOREIGN KEY (`variant_fk`) REFERENCES `product_variant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
