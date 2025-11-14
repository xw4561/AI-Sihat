-- AlterTable
ALTER TABLE "prescription_items" ADD COLUMN     "original_ai_recommendation" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "was_rejected" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "medicines_medicine_type_idx" ON "medicines"("medicine_type");
