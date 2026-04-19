-- AlterEnum
ALTER TYPE "RoomMemberRole" ADD VALUE 'admin';

-- CreateEnum
CREATE TYPE "RoomInviteStatus" AS ENUM ('pending', 'accepted', 'declined');

-- CreateTable
CREATE TABLE "RoomInvite" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "inviteeId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "status" "RoomInviteStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "RoomInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBan" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bannedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RoomBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomMember_roomId_role_idx" ON "RoomMember"("roomId", "role");

-- CreateIndex
CREATE INDEX "RoomInvite_roomId_status_idx" ON "RoomInvite"("roomId", "status");
CREATE INDEX "RoomInvite_inviteeId_status_createdAt_idx" ON "RoomInvite"("inviteeId", "status", "createdAt");
CREATE INDEX "RoomInvite_inviterId_createdAt_idx" ON "RoomInvite"("inviterId", "createdAt");

-- At most one pending invite per room/invitee pair.
CREATE UNIQUE INDEX "RoomInvite_roomId_inviteeId_pending_key"
  ON "RoomInvite"("roomId", "inviteeId")
  WHERE "status" = 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "RoomBan_roomId_userId_key" ON "RoomBan"("roomId", "userId");
CREATE INDEX "RoomBan_userId_createdAt_idx" ON "RoomBan"("userId", "createdAt");
CREATE INDEX "RoomBan_bannedById_createdAt_idx" ON "RoomBan"("bannedById", "createdAt");

-- AddForeignKey
ALTER TABLE "RoomInvite" ADD CONSTRAINT "RoomInvite_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomInvite" ADD CONSTRAINT "RoomInvite_inviteeId_fkey"
  FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomInvite" ADD CONSTRAINT "RoomInvite_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBan" ADD CONSTRAINT "RoomBan_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomBan" ADD CONSTRAINT "RoomBan_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomBan" ADD CONSTRAINT "RoomBan_bannedById_fkey"
  FOREIGN KEY ("bannedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
