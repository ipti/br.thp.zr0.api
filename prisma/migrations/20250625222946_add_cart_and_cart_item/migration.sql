-- CreateTable
CREATE TABLE `cart` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_fk` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cart_customer_fk_key`(`customer_fk`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cartItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cart_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cart` ADD CONSTRAINT `cart_customer_fk_key` FOREIGN KEY (`customer_fk`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cartItem` ADD CONSTRAINT `cartItem_cart_fk_fkey` FOREIGN KEY (`cart_fk`) REFERENCES `cart`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cartItem` ADD CONSTRAINT `cartItem_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
