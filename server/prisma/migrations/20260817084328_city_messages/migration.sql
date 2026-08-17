-- CreateTable
CREATE TABLE "city_messages" (
    "id" TEXT NOT NULL,
    "city_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "user_id" TEXT,
    "marker_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "city_messages_city_code_status_created_at_idx" ON "city_messages"("city_code", "status", "created_at");

-- AddForeignKey
ALTER TABLE "city_messages" ADD CONSTRAINT "city_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
