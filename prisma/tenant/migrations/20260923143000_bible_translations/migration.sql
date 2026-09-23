ALTER TABLE "Book" ADD COLUMN "translation" TEXT NOT NULL DEFAULT 'NVI';

DROP INDEX "Book_abbrev_key";

CREATE UNIQUE INDEX "Book_translation_abbrev_key" ON "Book"("translation", "abbrev");
