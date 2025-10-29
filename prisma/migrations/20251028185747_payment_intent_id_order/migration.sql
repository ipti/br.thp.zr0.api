/*
  Warnings:

  - A unique constraint covering the columns `[payment_intent_id]` on the table `order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `order` ADD COLUMN `payment_intent_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `order_payment_intent_id_key` ON `order`(`payment_intent_id`);
