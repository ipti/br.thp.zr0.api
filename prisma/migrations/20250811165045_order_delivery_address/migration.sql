-- CreateTable
CREATE TABLE `order_delivery_address` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `address` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `complement` VARCHAR(100) NULL,
    `neighborhood` VARCHAR(100) NULL,
    `state_fk` INTEGER NULL,
    `city_fk` INTEGER NULL,
    `order_fk` INTEGER NOT NULL,

    UNIQUE INDEX `order_delivery_address_order_fk_key`(`order_fk`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_delivery_address` ADD CONSTRAINT `order_delivery_address_state_fk_fkey` FOREIGN KEY (`state_fk`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_delivery_address` ADD CONSTRAINT `order_delivery_address_city_fk_fkey` FOREIGN KEY (`city_fk`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_delivery_address` ADD CONSTRAINT `order_delivery_address_order_fk_fkey` FOREIGN KEY (`order_fk`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
