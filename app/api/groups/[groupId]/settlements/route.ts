import { db, group, idempotencyKey, settlement } from "@/db/schema";
import { isGroupMember } from "@/lib/helpers/checks";
import { settlementInsertSchema } from "@/lib/zod/settlement";
import { auth } from "@/utils/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: number }> }
) {
  const { groupId } = await params;

  const session = await auth.api.getSession({
    headers: await headers()
  })
  if (!session?.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!await isGroupMember(session.user.id, groupId)) {
    return Response.json({ error: "You are not a member of this group. You can't add settlements." }, { status: 403 });
  }

  const groupData = await db.query.group.findFirst({
    where: eq(group.id, groupId),
  });

  if (!groupData) {
    return Response.json(
      {
        error: "Group not found",
      },
      { status: 404 }
    );
  }

  const settlements = db.query.settlement.findMany({
    where: eq(settlement.groupId, groupId),
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
  { params }: { params: Promise<{ groupId: number }> }
) {
  try {
    const { groupId } = await params;
    const idempotencyKeyHeader = request.headers.get("Idempotency-Key");

    const session = await auth.api.getSession({
      headers: await headers()
    })
    if (!session?.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groupData = await db.query.group.findFirst({
      where: eq(group.id, groupId),
    });

    if (!groupData) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    if (!await isGroupMember(session.user.id, groupId)) {
      return Response.json({ error: "You are not a member of this group. You can't add settlements." }, { status: 403 });
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
      return Response.json({ error: "You can't settle transactions with yourself." }, { status: 400 });
    }

    if (fromUserId !== session.user.id && toUserId !== session.user.id) {
      return Response.json({ error: "You can't settle transactions for others." }, { status: 403 });
    }
    const otherUserId = fromUserId === session.user.id ? toUserId : fromUserId;

    if (!await isGroupMember(otherUserId, groupId)) {
      return Response.json({ error: "You can't settle transactions with people outside the group." }, { status: 403 });
    }

    const result = await db.transaction(async (tx) => {
      if (idempotencyKeyHeader) {
        const [newKey] = await tx
          .insert(idempotencyKey)
          .values({
            key: idempotencyKeyHeader,
            userId: fromUserId,
            endpoint: request.url,
            responseBody: "PENDING",
          })
          .onConflictDoNothing()
          .returning();

        if (!newKey) {
          throw new Error("IDEMPOTENCY_CONFLICT");
        }
      }

      const [newSettlement] = await tx
        .insert(settlement)
        .values({
          amount: Math.round(amount * 100),
          fromUserId,
          toUserId,
          groupId,
        })
        .returning();

      return newSettlement;
    });

    return Response.json({ insertedSettlement: result }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT") {
      return Response.json(
        { error: "This request has already been processed." },
        { status: 409 }
      );
    }

    console.error("Error while creating settlement: ", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}