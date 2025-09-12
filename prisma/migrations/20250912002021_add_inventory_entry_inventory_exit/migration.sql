-- CreateTable
CREATE TABLE `inventory_entry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transformation_workshop_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_exit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transformation_workshop_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventory_entry` ADD CONSTRAINT `inventory_entry_transformation_workshop_fk_product_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`, `product_fk`) REFERENCES `inventory`(`transformation_workshop_fk`, `product_fk`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_exit` ADD CONSTRAINT `inventory_exit_transformation_workshop_fk_product_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`, `product_fk`) REFERENCES `inventory`(`transformation_workshop_fk`, `product_fk`) ON DELETE CASCADE ON UPDATE CASCADE;
