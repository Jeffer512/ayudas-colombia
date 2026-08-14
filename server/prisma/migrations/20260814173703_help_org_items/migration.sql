-- CreateTable
CREATE TABLE "help_org_items" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'available',
    "name" TEXT NOT NULL,
    "quantity" INTEGER,
    "unit" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_org_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "help_org_items_org_id_kind_idx" ON "help_org_items"("org_id", "kind");

-- AddForeignKey
ALTER TABLE "help_org_items" ADD CONSTRAINT "help_org_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "help_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_org_items" ADD CONSTRAINT "help_org_items_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "help_org_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
