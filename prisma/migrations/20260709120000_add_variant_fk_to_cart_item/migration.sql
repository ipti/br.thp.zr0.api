-- AlterTable
ALTER TABLE `cartItem`
    ADD COLUMN `variant_fk` INTEGER NULL;

-- CreateIndex
CREATE INDEX `cartItem_variant_fk_idx` ON `cartItem`(`variant_fk`);

-- AddForeignKey
ALTER TABLE `cartItem`
    ADD CONSTRAINT `cartItem_variant_fk_fkey`
    FOREIGN KEY (`variant_fk`) REFERENCES `product_variant`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
