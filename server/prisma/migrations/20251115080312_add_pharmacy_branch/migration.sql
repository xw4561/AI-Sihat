/*
  Warnings:

  - Added the required column `branch_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "branch_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_selected_branch_id" TEXT;

-- CreateTable
CREATE TABLE "pharmacy_branches" (
    "branch_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "pharmacy_branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_branches_user_id_key" ON "pharmacy_branches"("user_id");

-- CreateIndex
CREATE INDEX "chats_branch_id_idx" ON "chats"("branch_id");

-- CreateIndex
CREATE INDEX "users_last_selected_branch_id_idx" ON "users"("last_selected_branch_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_last_selected_branch_id_fkey" FOREIGN KEY ("last_selected_branch_id") REFERENCES "pharmacy_branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_branches" ADD CONSTRAINT "pharmacy_branches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "pharmacy_branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "pharmacy_branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;
