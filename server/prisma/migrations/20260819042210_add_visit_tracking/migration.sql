-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visits_visitor_id_created_at_idx" ON "visits"("visitor_id", "created_at");
