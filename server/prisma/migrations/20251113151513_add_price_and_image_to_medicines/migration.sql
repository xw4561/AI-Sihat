/*
  Warnings:

  - Added the required column `image_url` to the `medicines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `medicines` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "medicines" ADD COLUMN     "image_url" TEXT NOT NULL,
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL;
