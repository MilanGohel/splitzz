import { db, groupMember, user } from "@/db/schema";
import { isGroupMember } from "@/lib/helpers/checks";
import { getUserDebts } from "@/lib/helpers/queries";
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
    })
    if (!session?.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!await isGroupMember(session.user.id, groupIdInt)) {
      return Response.json({ error: "You are not a member of this group. You can't remove members." }, { status: 403 });
    }

    if (session.user.id === memberId) {
      return Response.json({ error: "You can't remove yourself." }, { status: 400 });
    }

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
