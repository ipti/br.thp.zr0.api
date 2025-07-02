-- DropForeignKey
ALTER TABLE `cart` DROP FOREIGN KEY `cart_customer_fk_key`;

-- CreateTable
CREATE TABLE `inventory` (
    `transformation_workshop_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    UNIQUE INDEX `inventory_transformation_workshop_fk_product_fk_key`(`transformation_workshop_fk`, `product_fk`),
    PRIMARY KEY (`transformation_workshop_fk`, `product_fk`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cart` ADD CONSTRAINT `cart_customer_fk_fkey` FOREIGN KEY (`customer_fk`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_transformation_workshop_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
