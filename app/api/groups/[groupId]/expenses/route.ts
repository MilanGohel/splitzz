import {
  db,
  expense,
  expenseShare,
  group,
  groupMember,
  activity,
  idempotencyKey,
} from "@/db/schema";
import { expenseInsertSchema } from "@/lib/zod/expense";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import z from "zod";
import { isGroupMember } from "@/lib/helpers/checks";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { ACTIVITY_TYPES } from "@/lib/zod/activity";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const groupIdInt = parseInt(groupId);
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isGroupMember(session.user.id, groupIdInt))) {
      return Response.json(
        {
          error: "You are not a member of this group. You can't view expenses.",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const expenses = await db.query.expense.findMany({
      where: eq(expense.groupId, groupIdInt),
      orderBy: desc(expense.createdAt),
      limit: limit,
      offset: offset,
      with: {
        paidBy: true,
        shares: true,
      },
    });

    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(expense)
      .where(eq(expense.groupId, groupIdInt));

    const total = Number(totalCountResult[0]?.count || 0);

    return Response.json({
      expenses: expenses,
      pagination: {
        limit,
        offset,
        total,
      }
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const groupIdInt = parseInt(groupId);
  const idempotencyKeyHeader = request.headers.get("Idempotency-Key");

  try {
    if (idempotencyKeyHeader) {
      const existingKey = await db.query.idempotencyKey.findFirst({
        where: eq(idempotencyKey.key, idempotencyKeyHeader),
      });

      if (existingKey) {
        if (existingKey.responseBody === "PENDING") {
          return Response.json(
            { error: "Request is currently being processed" },
            { status: 409 }
          );
        }
        return Response.json(existingKey.responseBody, {
          status: existingKey.responseStatus,
        });
      }
    }
    if (!idempotencyKeyHeader) {
      return Response.json(
        {
          error: "Idempotency key is required",
        },
        { status: 400 }
      );
    }
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
          eq(groupMember.groupId, groupIdInt),
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
      amountCents: Math.round(share.shareAmount * 100),
    }));

    const sumOfShares = sharesWithCents.reduce(
      (sum, item) => sum + item.amountCents,
      0
    );

    if (sumOfShares !== totalAmountCents) {
      return Response.json(
        {
          error: "Validation Error",
          message: `Total amount (${totalAmount}) does not equal the sum of shares (${sumOfShares})`,
        },
        { status: 400 }
      );
    }

    const [groupData] = await db
      .select()
      .from(group)
      .where(eq(group.id, groupIdInt))
      .limit(1);

    if (!groupData) {
      return Response.json(
        { error: `Group with ID ${groupIdInt} not found.` },
        { status: 404 }
      );
    }

    const result = await db.transaction(async (tx) => {
      if (idempotencyKeyHeader) {
        await tx.insert(idempotencyKey).values({
          key: idempotencyKeyHeader,
          endpoint: request.url,
          responseBody: "PENDING",
          responseStatus: 202,
          userId: paidBy,
        });
      }

      const [insertedExpense] = await tx
        .insert(expense)
        .values({
          description,
          groupId: groupIdInt,
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

      const expenseWithRelations = await tx.query.expense.findFirst({
        where: eq(expense.id, insertedExpense.id),
        with: {
          paidBy: true,
          shares: true,
        },
      });

      if (idempotencyKeyHeader) {
        await tx
          .update(idempotencyKey)
          .set({
            responseBody: { expense: expenseWithRelations },
            responseStatus: 201,
          })
          .where(eq(idempotencyKey.key, idempotencyKeyHeader));
      }

      await tx.insert(activity).values({
        type: ACTIVITY_TYPES.EXPENSE_CREATE,
        groupId: groupIdInt,
        userId: paidBy,
        metadata: {
          expenseId: insertedExpense.id,
          expenseDescription: description,
          amount: totalAmount,
          currency: "INR",
        },
      })
      return expenseWithRelations;
    });

    return Response.json({ expense: result }, { status: 201 });
  } catch (error: any) {
    // Postgres unique constraint violation code
    if ((error as any).code === "23505" && idempotencyKeyHeader) {
      const existingKey = await db.query.idempotencyKey.findFirst({
        where: eq(idempotencyKey.key, idempotencyKeyHeader),
      });
      if (existingKey) {
        if (existingKey.responseBody === "PENDING") {
          return Response.json(
            { error: "Request is currently being processed" },
            { status: 409 }
          );
        }
        return Response.json(existingKey.responseBody, {
          status: existingKey.responseStatus,
        });
      }
    }
    console.error("Error while creating expense: ", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
