import { db, expense, expenseShare, group, groupMember } from "@/db/schema";
import { auth } from "@/utils/auth"; // Check path
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ expenseId: number }> }
) {
  try {
    const { expenseId } = await params;

    // 1. Authenticate User
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch the Expense first
    const [expenseData] = await db
      .select()
      .from(expense)
      .where(eq(expense.id, expenseId))
      .limit(1);

    // FIX: Check if undefined (array empty), not just null
    if (!expenseData) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    // 3. SECURITY CHECK: Is the user a member of this expense's group?
    // We use the groupId from the expense we just fetched
    const [membership] = await db
      .select()
      .from(groupMember)
      .where(
        and(
          eq(groupMember.groupId, expenseData.groupId),
          eq(groupMember.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return Response.json(
        { error: "Access Denied: You are not a member of this group." },
        { status: 403 }
      );
    }

    // 4. Fetch Shares (Only if security passes)
    const expenseSharesData = await db
      .select()
      .from(expenseShare)
      .where(eq(expenseShare.expenseId, expenseId));

    return Response.json({
      expense: expenseData,
      expenseShares: expenseSharesData,
    });

  } catch (error) {
    console.error("Error while fetching expense data:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ expenseId: number }> }
) {
  try {
    const { expenseId } = await params;

    // 1. Authenticate
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Expense AND Group details
    // We need to know who paid for the expense AND who owns the group

    // A. Get Expense
    const [expenseData] = await db
      .select()
      .from(expense)
      .where(eq(expense.id, expenseId))
      .limit(1);

    if (!expenseData) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    // B. Get Group (to check owner)
    const [groupData] = await db
      .select()
      .from(group)
      .where(eq(group.id, expenseData.groupId))
      .limit(1);

    if (!groupData) {
      return Response.json({ error: "Associated group not found" }, { status: 404 });
    }

    // 3. AUTHORIZATION CHECK
    // Allow delete if: (User is Payer) OR (User is Group Owner)
    const isPayer = expenseData.paidBy === session.user.id;
    const isGroupOwner = groupData.ownerId === session.user.id;

    if (!isPayer && !isGroupOwner) {
      return Response.json(
        { error: "Access Denied: Only the payer or group admin can delete this." },
        { status: 403 }
      );
    }

    // 4. Delete
    const result = await db
      .delete(expense)
      .where(eq(expense.id, expenseId))
      .returning();

    return Response.json(
      {
        message: "Expense deleted successfully",
        deletedItem: result[0],
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error while deleting expense data:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}