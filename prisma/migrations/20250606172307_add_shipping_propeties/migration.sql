/*
  Warnings:

  - Added the required column `height` to the `product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `length` to the `product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `product` ADD COLUMN `height` DOUBLE NOT NULL,
    ADD COLUMN `length` DOUBLE NOT NULL,
    ADD COLUMN `weight` DOUBLE NOT NULL,
    ADD COLUMN `width` DOUBLE NOT NULL;
