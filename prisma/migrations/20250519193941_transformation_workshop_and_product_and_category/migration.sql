-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('CUSTOMER', 'SELLER', 'SELLER_MANAGER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE `transformation_workshop` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `cep` VARCHAR(8) NULL,
    `address` VARCHAR(100) NULL,
    `number` VARCHAR(10) NULL,
    `complement` VARCHAR(100) NULL,
    `neighborhood` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `state_fk` INTEGER NULL,
    `city_fk` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `state` (
    `id` INTEGER NOT NULL,
    `acronym` VARCHAR(2) NOT NULL,
    `name` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `id`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `city` (
    `id` INTEGER NOT NULL,
    `state_fk` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `cep_initial` VARCHAR(9) NULL,
    `cep_final` VARCHAR(9) NULL,
    `ddd1` SMALLINT NULL,
    `ddd2` SMALLINT NULL,

    UNIQUE INDEX `id`(`id`),
    INDEX `state_fk`(`state_fk`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transformation_workshop_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `user_fk` INTEGER NOT NULL,
    `transformation_workshop_fk` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `price` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `category_fk` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workshop_stock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_fk` INTEGER NOT NULL,
    `transformation_workshop_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `date_start` DATETIME(3) NULL,
    `date_end` DATETIME(3) NULL,
    `status` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transformation_workshop` ADD CONSTRAINT `transformation_workshop_state_fk_fkey` FOREIGN KEY (`state_fk`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transformation_workshop` ADD CONSTRAINT `transformation_workshop_city_fk_fkey` FOREIGN KEY (`city_fk`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `city` ADD CONSTRAINT `city_ibfk_1` FOREIGN KEY (`state_fk`) REFERENCES `state`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `transformation_workshop_user` ADD CONSTRAINT `transformation_workshop_user_user_fk_fkey` FOREIGN KEY (`user_fk`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transformation_workshop_user` ADD CONSTRAINT `transformation_workshop_user_transformation_workshop_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_category_fk_fkey` FOREIGN KEY (`category_fk`) REFERENCES `category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workshop_stock` ADD CONSTRAINT `workshop_stock_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production` ADD CONSTRAINT `production_product_fk_fkey` FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production` ADD CONSTRAINT `production_transformation_workshop_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`) REFERENCES `transformation_workshop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
