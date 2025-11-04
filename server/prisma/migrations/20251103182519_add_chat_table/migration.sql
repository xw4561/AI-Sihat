-- CreateTable
CREATE TABLE "chats" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "sessionData" JSONB NOT NULL,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
