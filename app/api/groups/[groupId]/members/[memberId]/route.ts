import { activity, db, groupMember, user } from "@/db/schema";
import { isGroupMember, resolveGroupScope } from "@/lib/auth/scope";
import { getGroupDebts } from "@/lib/ledger";
import { ACTIVITY_TYPES } from "@/lib/zod/activity";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  try {
    const { groupId, memberId } = await params;
    const scope = await resolveGroupScope(request, groupId);
    if (!scope.ok) return scope.response;
    const groupIdInt = scope.group.id;

    if (memberId === scope.group.ownerId) {
      return Response.json(
        { error: "The group owner cannot be removed from the group." },
        { status: 400 }
      );
    }

    const isOwner = scope.role === "owner";
    const isSelf = scope.user.id === memberId;
    if (!isOwner && !isSelf) {
      return Response.json(
        {
          error:
            "Forbidden: Only the group owner or the member themselves can remove this member.",
        },
        { status: 403 }
      );
    }

    if (!(await isGroupMember(memberId, groupIdInt))) {
      return Response.json(
        { error: "Member not found in this group" },
        { status: 404 }
      );
    }

    // 1. Check for active debts using Ledger
    const userDebts = await getGroupDebts(groupIdInt, memberId);

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
        and(
          eq(groupMember.groupId, groupIdInt),
          eq(groupMember.userId, memberId)
        )
      )
      .returning();

    if (result.length === 0) {
      return Response.json(
        { error: "Member not found in this group" },
        { status: 404 }
      );
    }

    const userFound = await db.query.user.findFirst({
      where: eq(user.id, memberId),
    });

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
