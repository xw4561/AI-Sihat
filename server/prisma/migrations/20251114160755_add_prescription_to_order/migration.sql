-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "prescription_id" TEXT;

-- CreateIndex
CREATE INDEX "orders_prescription_id_idx" ON "orders"("prescription_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("prescription_id") ON DELETE SET NULL ON UPDATE CASCADE;
