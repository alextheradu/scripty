-- AlterTable
ALTER TABLE "ScriptComment"
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolvedById" TEXT;

-- CreateTable
CREATE TABLE "ScriptCommentReply" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "ScriptCommentReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptCommentReaction" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ScriptCommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScriptCommentReaction_commentId_userId_emoji_key" ON "ScriptCommentReaction"("commentId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "ScriptComment" ADD CONSTRAINT "ScriptComment_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptCommentReply" ADD CONSTRAINT "ScriptCommentReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ScriptComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptCommentReply" ADD CONSTRAINT "ScriptCommentReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptCommentReaction" ADD CONSTRAINT "ScriptCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ScriptComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptCommentReaction" ADD CONSTRAINT "ScriptCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
