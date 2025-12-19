import { db, groupMember, user } from "@/db/schema";
import { getUserDebts } from "@/lib/helpers/queries";
import { and, eq, sql } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: number; memberId: string }> }
) {
  try {
    const { groupId, memberId } = await params;

    // 1. Check for active debts
    const userDebts = await getUserDebts(memberId, groupId);

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
        and(eq(groupMember.groupId, groupId), eq(groupMember.userId, memberId))
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
