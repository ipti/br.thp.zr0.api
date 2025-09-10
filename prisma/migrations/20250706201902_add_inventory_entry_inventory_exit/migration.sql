-- CreateTable
CREATE TABLE `inventoryEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transformation_workshop_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventoryExit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transformation_workshop_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventoryEntry` ADD CONSTRAINT `inventoryEntry_transformation_workshop_fk_product_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`, `product_fk`) REFERENCES `inventory`(`transformation_workshop_fk`, `product_fk`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventoryExit` ADD CONSTRAINT `inventoryExit_transformation_workshop_fk_product_fk_fkey` FOREIGN KEY (`transformation_workshop_fk`, `product_fk`) REFERENCES `inventory`(`transformation_workshop_fk`, `product_fk`) ON DELETE CASCADE ON UPDATE CASCADE;
