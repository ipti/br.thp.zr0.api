-- CreateTable
CREATE TABLE `address_customer` (
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
    `customer_fk` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `address_customer` ADD CONSTRAINT `address_customer_state_fk_fkey` FOREIGN KEY (`state_fk`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `address_customer` ADD CONSTRAINT `address_customer_city_fk_fkey` FOREIGN KEY (`city_fk`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `address_customer` ADD CONSTRAINT `address_customer_customer_fk_fkey` FOREIGN KEY (`customer_fk`) REFERENCES `customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
