-- CreateTable
CREATE TABLE "request_helpers" (
    "id" BIGSERIAL NOT NULL,
    "request_id" TEXT NOT NULL,
    "marker_id" TEXT,
    "name" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_helpers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_helpers_request_id_idx" ON "request_helpers"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "request_helpers_request_id_marker_id_key" ON "request_helpers"("request_id", "marker_id");

-- AddForeignKey
ALTER TABLE "request_helpers" ADD CONSTRAINT "request_helpers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
