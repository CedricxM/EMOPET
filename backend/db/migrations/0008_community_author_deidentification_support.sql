-- Schema support for the existing R2 delete-first Community policy.
-- author_id becomes nullable so a future executor can explicitly de-identify a
-- post/comment only when deleting it would materially break a multi-party
-- thread. The FK remains NO ACTION: account deletion does NOT automatically
-- null authors and therefore cannot bypass the delete-first decision path.

ALTER TABLE "posts" ALTER COLUMN "author_id" DROP NOT NULL;
ALTER TABLE "comments" ALTER COLUMN "author_id" DROP NOT NULL;
