CREATE UNIQUE INDEX "Chapter_bookId_number_key" ON "Chapter"("bookId", "number");

CREATE UNIQUE INDEX "Verse_chapterId_number_key" ON "Verse"("chapterId", "number");
