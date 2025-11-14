-- CreateEnum
CREATE TYPE "MedicineType" AS ENUM ('OTC', 'NON_OTC');

-- CreateTable
CREATE TABLE "prescriptions" (
    "prescription_id" TEXT NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "pharmacist_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(50) NOT NULL,
    "customer_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("prescription_id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "prescription_item_id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "medicine_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "symptom" TEXT,
    "ai_recommendation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("prescription_item_id")
);

-- AlterTable
ALTER TABLE "medicines" ADD COLUMN "medicine_type_new" "MedicineType";

-- Update existing data
UPDATE "medicines" SET "medicine_type" = 'OTC' WHERE UPPER("medicine_type") = 'OTC';
UPDATE "medicines" SET "medicine_type" = 'NON_OTC' WHERE UPPER("medicine_type") IN ('NON_OTC', 'NON-OTC', 'NONOTC');

UPDATE "medicines" SET "medicine_type_new" = 
    CASE 
        WHEN UPPER("medicine_type") = 'OTC' THEN 'OTC'::"MedicineType"
        ELSE 'NON_OTC'::"MedicineType"
    END;

ALTER TABLE "medicines" DROP COLUMN "medicine_type";
ALTER TABLE "medicines" RENAME COLUMN "medicine_type_new" TO "medicine_type";
ALTER TABLE "medicines" ALTER COLUMN "medicine_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "prescription_item_id" TEXT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "order_type",
DROP COLUMN "use_ai",
ADD COLUMN "total_price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "prescriptions_user_id_idx" ON "prescriptions"("user_id");
CREATE INDEX "prescriptions_pharmacist_id_idx" ON "prescriptions"("pharmacist_id");
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");
CREATE INDEX "prescriptions_chat_id_idx" ON "prescriptions"("chat_id");

-- CreateIndex
CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");
CREATE INDEX "prescription_items_medicine_id_idx" ON "prescription_items"("medicine_id");

-- CreateIndex
CREATE INDEX "order_items_prescription_item_id_idx" ON "order_items"("prescription_item_id");

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_pharmacist_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("prescription_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("medicine_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("prescription_item_id") ON DELETE SET NULL ON UPDATE CASCADE;
