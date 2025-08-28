/*
  Warnings:

  - Made the column `uid` on table `product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `product` MODIFY `uid` VARCHAR(191) NOT NULL;
