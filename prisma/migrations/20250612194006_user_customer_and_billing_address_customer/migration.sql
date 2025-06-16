-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cpf` VARCHAR(11) NULL,
    `cnpj` VARCHAR(14) NULL,
    `birthday` DATETIME(3) NULL,
    `phone` VARCHAR(191) NULL,
    `corporate_name` VARCHAR(150) NULL,
    `trade_name` VARCHAR(150) NULL,
    `user_fk` INTEGER NOT NULL,

    UNIQUE INDEX `customer_user_fk_key`(`user_fk`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_address_customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cep` VARCHAR(191) NULL,
    `address` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `complement` VARCHAR(100) NULL,
    `neighborhood` VARCHAR(100) NULL,
    `state_fk` INTEGER NULL,
    `city_fk` INTEGER NULL,
    `customer_fk` INTEGER NOT NULL,

    UNIQUE INDEX `billing_address_customer_customer_fk_key`(`customer_fk`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_user_fk_fkey` FOREIGN KEY (`user_fk`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_address_customer` ADD CONSTRAINT `billing_address_customer_state_fk_fkey` FOREIGN KEY (`state_fk`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_address_customer` ADD CONSTRAINT `billing_address_customer_city_fk_fkey` FOREIGN KEY (`city_fk`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_address_customer` ADD CONSTRAINT `billing_address_customer_customer_fk_fkey` FOREIGN KEY (`customer_fk`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
