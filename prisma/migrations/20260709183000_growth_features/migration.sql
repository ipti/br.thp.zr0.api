CREATE TABLE `product_review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_fk` INTEGER NOT NULL,
    `user_fk` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_review_product_fk_user_fk_key`(`product_fk`, `user_fk`),
    INDEX `product_review_product_fk_idx`(`product_fk`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `wishlist_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_fk` INTEGER NOT NULL,
    `product_fk` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `wishlist_item_user_fk_product_fk_key`(`user_fk`, `product_fk`),
    INDEX `wishlist_item_user_fk_idx`(`user_fk`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `coupon` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `discount_type` ENUM('PERCENT', 'FIXED') NOT NULL,
    `discount_value` DOUBLE NOT NULL,
    `min_order_value` DOUBLE NULL,
    `max_uses` INTEGER NULL,
    `uses_count` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupon_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `order`
    ADD COLUMN `discount_amount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `coupon_fk` INTEGER NULL;

ALTER TABLE `product_review`
    ADD CONSTRAINT `product_review_product_fk_fkey`
    FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `product_review_user_fk_fkey`
    FOREIGN KEY (`user_fk`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `wishlist_item`
    ADD CONSTRAINT `wishlist_item_user_fk_fkey`
    FOREIGN KEY (`user_fk`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `wishlist_item_product_fk_fkey`
    FOREIGN KEY (`product_fk`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `order`
    ADD CONSTRAINT `order_coupon_fk_fkey`
    FOREIGN KEY (`coupon_fk`) REFERENCES `coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
