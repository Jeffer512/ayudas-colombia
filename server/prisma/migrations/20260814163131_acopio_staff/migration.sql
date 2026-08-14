-- CreateTable
CREATE TABLE "acopio_staff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'manager',
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acopio_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acopio_staff_email_key" ON "acopio_staff"("email");

-- CreateIndex
CREATE INDEX "acopio_staff_org_id_idx" ON "acopio_staff"("org_id");

-- AddForeignKey
ALTER TABLE "acopio_staff" ADD CONSTRAINT "acopio_staff_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "acopio_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
