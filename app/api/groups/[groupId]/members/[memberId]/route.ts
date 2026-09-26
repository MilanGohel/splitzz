import { activity, db, group, groupMember, user } from "@/db/schema";
import { isGroupMember } from "@/lib/helpers/checks";
import { getUserDebts } from "@/lib/helpers/queries";
import { ACTIVITY_TYPES } from "@/lib/zod/activity";
import { auth } from "@/utils/auth";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  try {
    const { groupId, memberId } = await params;
    const groupIdInt = parseInt(groupId);

    const session = await auth.api.getSession({
      headers: await headers()
    });
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groupData = await db.query.group.findFirst({
      where: eq(group.id, groupIdInt),
    });

    if (!groupData) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    if (!await isGroupMember(session.user.id, groupIdInt)) {
      return Response.json({ error: "You are not a member of this group. You can't remove members." }, { status: 403 });
    }

    if (memberId === groupData.ownerId) {
      return Response.json({ error: "The group owner cannot be removed from the group." }, { status: 400 });
    }

    const isOwner = groupData.ownerId === session.user.id;
    const isSelf = session.user.id === memberId;
    if (!isOwner && !isSelf) {
      return Response.json({ error: "Forbidden: Only the group owner or the member themselves can remove this member." }, { status: 403 });
    }

    const userFound = await db.query.user.findFirst({
      where: eq(user.id, memberId),
    });

    if (!await isGroupMember(memberId, groupIdInt)) {
      return Response.json({ error: "Member not found in this group" }, { status: 404 });
    }
    // 1. Check for active debts
    const userDebts = await getUserDebts(memberId, groupIdInt);

    if (userDebts.length > 0) {
      return Response.json(
        {
          error: "You can't delete the user until all debts are cleared.",
          details: userDebts,
        },
        { status: 400 }
      );
    }

    const result = await db
      .delete(groupMember)
      .where(
        and(eq(groupMember.groupId, groupIdInt), eq(groupMember.userId, memberId))
      )
      .returning();


    if (result.length === 0) {
      return Response.json(
        { error: "Member not found in this group" },
        { status: 404 }
      );
    }

    await db.insert(activity).values({
      type: ACTIVITY_TYPES.GROUP_LEAVE,
      groupId: groupIdInt,
      userId: memberId,
      metadata: {
        userId: userFound?.id,
        name: userFound?.name,
        email: userFound?.email,
      },
    });

    return Response.json(
      {
        message: "Member successfully removed",
        removedMember: result[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing member:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
