/*
  Warnings:

  - You are about to drop the column `recommendation` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `sessionData` on the `chats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chats" DROP COLUMN "recommendation",
DROP COLUMN "sessionData";
