-- AlterTable
-- AddForeignKey
ALTER TABLE "city_messages" ADD CONSTRAINT "city_messages_city_code_fkey" FOREIGN KEY ("city_code") REFERENCES "cities"("code") ON DELETE RESTRICT ON UPDATE CASCADE;