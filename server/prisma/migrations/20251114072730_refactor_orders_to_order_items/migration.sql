/*
  Warnings:

  - You are about to drop the column `medicine_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `orders` table. All the data in the column will be lost.
  - Added the required column `customer_name` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_phone` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_medicine_id_fkey";

-- DropIndex
DROP INDEX "public"."orders_medicine_id_idx";

-- AlterTable
ALTER TABLE "medicines" ALTER COLUMN "image_url" DROP NOT NULL,
ALTER COLUMN "price" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "medicine_id",
DROP COLUMN "quantity",
ADD COLUMN     "customer_address" TEXT,
ADD COLUMN     "customer_name" VARCHAR(255) NOT NULL,
ADD COLUMN     "customer_phone" VARCHAR(50) NOT NULL;

-- CreateTable
CREATE TABLE "order_items" (
    "order_item_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "medicine_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("order_item_id")
);

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_medicine_id_idx" ON "order_items"("medicine_id");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("medicine_id") ON DELETE RESTRICT ON UPDATE CASCADE;
