CREATE TABLE "BibleTranslation" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

CREATE TABLE "BibleBook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "abbrev" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "testament" TEXT NOT NULL,
    "position" INTEGER NOT NULL
);

CREATE TABLE "BibleVerse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "translationCode" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "BibleVerse_translationCode_fkey" FOREIGN KEY ("translationCode") REFERENCES "BibleTranslation" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BibleVerse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BibleBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BibleBook_abbrev_key" ON "BibleBook"("abbrev");
CREATE UNIQUE INDEX "BibleBook_position_key" ON "BibleBook"("position");
CREATE UNIQUE INDEX "BibleVerse_translationCode_bookId_chapter_number_key" ON "BibleVerse"("translationCode", "bookId", "chapter", "number");
CREATE INDEX "BibleVerse_translationCode_bookId_chapter_number_idx" ON "BibleVerse"("translationCode", "bookId", "chapter", "number");
