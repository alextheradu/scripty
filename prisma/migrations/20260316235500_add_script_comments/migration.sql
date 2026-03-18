-- CreateTable
CREATE TABLE "ScriptComment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "quotedText" TEXT NOT NULL,
    "startLineId" TEXT NOT NULL,
    "endLineId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scriptId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "ScriptComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScriptComment" ADD CONSTRAINT "ScriptComment_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptComment" ADD CONSTRAINT "ScriptComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
