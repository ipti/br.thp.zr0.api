-- CreateTable
CREATE TABLE
    `customer` (
        `id` INTEGER NOT NULL AUTO_INCREMENT,
        `user_fk` INTEGER NOT NULL,
        `phone_number` VARCHAR(20) NOT NULL,
        `cpf_cnpj` VARCHAR(16) NOT NULL,
        `type` ENUM ('PF', 'PJ') NOT NULL,
        PRIMARY KEY (`id`)
    ) DEFAULT CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE
    `customer_address` (
        `id` INTEGER NOT NULL AUTO_INCREMENT,
        `customer_fk` INTEGER NOT NULL,
        `state_fk` INTEGER NOT NULL,
        `city_fk` INTEGER NOT NULL,
        `cep` VARCHAR(10) NOT NULL,
        `number` INTEGER NOT NULL,
        `street` VARCHAR(80) NOT NULL,
        `neighborhood` VARCHAR(80) NOT NULL,
        `complement` VARCHAR(30) NOT NULL,
        PRIMARY KEY (`id`)
    ) DEFAULT CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_user_fk_fkey` FOREIGN KEY (`user_fk`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_state_fk_fkey` FOREIGN KEY (`state_fk`) REFERENCES `state` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_customer_fk_fkey` FOREIGN KEY (`customer_fk`) REFERENCES `customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_city_fk_fkey` FOREIGN KEY (`city_fk`) REFERENCES `city` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;