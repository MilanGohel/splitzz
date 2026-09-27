import { activity, db, idempotencyKey, settlement } from "@/db/schema";
import { isGroupMember, resolveGroupScope } from "@/lib/auth/scope";
import { ACTIVITY_TYPES } from "@/lib/zod/activity";
import { settlementInsertSchema } from "@/lib/zod/settlement";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const scope = await resolveGroupScope(request, groupId);
  if (!scope.ok) return scope.response;
  const groupIdInt = scope.group.id;

  const settlements = await db.query.settlement.findMany({
    where: eq(settlement.groupId, groupIdInt),
    with: {
      fromUser: true,
      toUser: true,
    },
  });

  return Response.json(
    {
      settlements,
    },
    { status: 200 }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const scope = await resolveGroupScope(request, groupId);
  if (!scope.ok) return scope.response;
  const groupIdInt = scope.group.id;
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

    const body = await request.json();
    const validation = await settlementInsertSchema.safeParseAsync(body);

    if (!validation.success) {
      return Response.json(
        { error: "Invalid request body", details: validation.error },
        { status: 400 }
      );
    }

    const { amount, fromUserId, toUserId } = validation.data;
    if (toUserId === fromUserId) {
      return Response.json(
        { error: "You can't settle transactions with yourself." },
        { status: 400 }
      );
    }

    if (fromUserId !== scope.user.id && toUserId !== scope.user.id) {
      return Response.json(
        { error: "You can't settle transactions for others." },
        { status: 403 }
      );
    }
    const otherUserId = fromUserId === scope.user.id ? toUserId : fromUserId;

    if (!(await isGroupMember(otherUserId, groupIdInt))) {
      return Response.json(
        {
          error:
            "You can't settle transactions with people outside the group.",
        },
        { status: 403 }
      );
    }

    const result = await db.transaction(async (tx) => {
      if (idempotencyKeyHeader) {
        await tx.insert(idempotencyKey).values({
          key: idempotencyKeyHeader,
          userId: scope.user.id,
          endpoint: request.url,
          responseBody: "PENDING",
          responseStatus: 202,
        });
      }

      const [newSettlement] = await tx
        .insert(settlement)
        .values({
          amount: Math.round(amount * 100),
          fromUserId,
          toUserId,
          groupId: groupIdInt,
        })
        .returning();

      if (idempotencyKeyHeader) {
        await tx
          .update(idempotencyKey)
          .set({
            responseBody: { insertedSettlement: newSettlement },
            responseStatus: 201,
          })
          .where(eq(idempotencyKey.key, idempotencyKeyHeader));
      }

      await tx.insert(activity).values({
        groupId: groupIdInt,
        userId: scope.user.id,
        type: ACTIVITY_TYPES.SETTLEMENT_CREATE,
        metadata: {
          settlement: newSettlement,
          amount: newSettlement.amount / 100,
          currency: "INR",
        },
      });
      return newSettlement;
    });

    return Response.json({ insertedSettlement: result }, { status: 201 });
  } catch (error: unknown) {
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

    console.error("Error while creating settlement: ", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}