import { db, expense, expenseShare, group, groupMember } from "@/db/schema";
import { expenseInsertSchema } from "@/lib/zod/expense";
import { eq, desc, inArray, and } from "drizzle-orm";
import z from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: number }> }
) {
  try {
    const { groupId } = await params;

    const expenses = await db
      .select()
      .from(expense)
      .where(eq(expense.groupId, groupId))
      .orderBy(desc(expense.createdAt));

    return Response.json({ expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: number }> }
) {
  try {
    const { groupId } = await params;

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

    const uniqueMemberSet = new Set<string>();
    uniqueMemberSet.add(paidBy);
    shares.forEach((share) => uniqueMemberSet.add(share.userId));

    const validMembers = await db
      .select()
      .from(groupMember)
      .where(
        and(
          eq(groupMember.groupId, groupId),
          inArray(groupMember.userId, Array.from(uniqueMemberSet))
        )
      );

    if (validMembers.length !== uniqueMemberSet.size) {
      return Response.json(
        {
          error: "One or more users are not in this group.",
        },
        { status: 404 }
      );
    }
    const totalAmountCents = Math.round(totalAmount * 100);

    const sharesWithCents = shares.map((share) => ({
      ...share,
      amountCents: Math.round(share.amount * 100),
    }));

    const sumOfShares = sharesWithCents.reduce(
      (sum, item) => sum + item.amountCents,
      0
    );

    if (sumOfShares !== totalAmountCents) {
      return Response.json(
        {
          error: "Validation Error",
          message: `Total amount (${totalAmount}) does not equal the sum of shares (${
            sumOfShares / 100
          })`,
        },
        { status: 400 }
      );
    }

    const groupData = await db
      .select()
      .from(group)
      .where(eq(group.id, groupId))
      .limit(1);

    if (groupData.length === 0) {
      return Response.json(
        { error: `Group with ID ${groupId} not found.` },
        { status: 404 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [insertedExpense] = await tx
        .insert(expense)
        .values({
          description,
          groupId: groupId,
          paidBy,
          totalAmount: totalAmountCents,
        })
        .returning();

      await tx.insert(expenseShare).values(
        sharesWithCents.map((share) => ({
          userId: share.userId,
          expenseId: insertedExpense.id,
          shareAmount: share.amountCents,
        }))
      );

      return insertedExpense;
    });

    return Response.json({ expense: result }, { status: 201 });
  } catch (error) {
    console.error("Error while creating expense: ", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
