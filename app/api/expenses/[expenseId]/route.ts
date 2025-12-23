import { db, expense, expenseShare, group, groupMember } from "@/db/schema";
import { expenseInsertSchema } from "@/lib/zod/expense";
import { auth } from "@/utils/auth"; // Check path
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

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
    const expenseData = await db.query.expense.findFirst({
      where: eq(expense.id, expenseId),
      with: {
        paidBy: true
      }
    })

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
      expense: expenseData.totalAmount,
      expenseShares: expenseSharesData.map((esd) => {
        return { ...esd, shareAmount: esd.shareAmount }
      }),
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

export async function PATCH(
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

    // 2. Fetch Existing Expense & Group Info (for permission check)
    const [existingExpense] = await db
      .select()
      .from(expense)
      .where(eq(expense.id, expenseId))
      .limit(1);

    if (!existingExpense) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    const [groupData] = await db
      .select()
      .from(group)
      .where(eq(group.id, existingExpense.groupId))
      .limit(1);

    // 3. Authorization: Only Payer or Group Owner can edit
    const isPayer = existingExpense.paidBy === session.user.id;
    const isOwner = groupData?.ownerId === session.user.id;

    if (!isPayer && !isOwner) {
      return Response.json(
        { error: "Access Denied: Only the payer or group admin can edit this expense." },
        { status: 403 }
      );
    }

    // 4. Validate Input Data
    const body = await request.json();
    const validatedData = await expenseInsertSchema.safeParseAsync(body);

    if (!validatedData.success) {
      return Response.json(
        {
          error: "Invalid input",
          details: z.treeifyError(validatedData.error),
        },
        { status: 400 }
      );
    }

    const { description, paidBy, totalAmount, shares } = validatedData.data;

    // 5. Math & Currency Validation
    const totalAmountCents = Math.round(totalAmount * 100);
    const sharesWithCents = shares.map((share) => ({
      ...share,
      amountCents: Math.round(share.shareAmount * 100),
    }));

    const sumOfShares = sharesWithCents.reduce((sum, s) => sum + s.amountCents, 0);

    if (sumOfShares !== totalAmountCents) {
      return Response.json(
        {
          error: "Math Error",
          message: `Total amount (${totalAmount}) does not match sum of shares (${sumOfShares})`,
        },
        { status: 400 }
      );
    }

    // 6. Transaction: Update Expense + Replace Shares
    const result = await db.transaction(async (tx) => {
      const now = new Date();

      // A. Update the main Expense record
      const [updatedExpense] = await tx
        .update(expense)
        .set({
          description,
          paidBy,
          totalAmount: totalAmountCents,
          updatedAt: now, // Important: Update the timestamp
        })
        .where(eq(expense.id, expenseId))
        .returning();

      // B. DELETE old shares (Clean slate approach)
      await tx
        .delete(expenseShare)
        .where(eq(expenseShare.expenseId, expenseId));

      // C. INSERT new shares
      await tx.insert(expenseShare).values(
        sharesWithCents.map((share) => ({
          userId: share.userId,
          expenseId: expenseId,
          shareAmount: share.amountCents,
          createdAt: existingExpense.createdAt, // Keep original creation date
          updatedAt: now,
        }))
      );
      const resultData = db.query.expense.findFirst({
        where: eq(expense.id, updatedExpense.id),
        with: {
          paidBy: true,
          shares: true
        }
      })
      return resultData;
    });

    return Response.json({
      message: "Expense updated successfully",
      expense: result
    }, { status: 200 });

  } catch (error) {
    console.error("Error updating expense:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}