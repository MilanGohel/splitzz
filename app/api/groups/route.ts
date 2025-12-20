import { db, group, groupMember, user } from "@/db/schema";
import { groupInsertSchema } from "@/lib/zod/group";
import { auth } from "@/utils/auth";
import { eq, inArray, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get User
    const [userData] = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (!userData) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Get Group Memberships
    const userGroups = await db
      .select()
      .from(groupMember)
      .where(eq(groupMember.userId, userData.id));

    const groupIds = userGroups.map((gm) => gm.groupId);

    if (groupIds.length === 0) {
      return Response.json({ groups: [] });
    }

    const groups = await db
      .select()
      .from(group)
      .where(inArray(group.id, groupIds))
      .orderBy(desc(group.createdAt));

    return Response.json({ groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = await groupInsertSchema.safeParseAsync(body);

    if (!validation.success) {
      return Response.json(
        { error: "Invalid input", details: z.treeifyError(validation.error) },
        { status: 400 }
      );
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userData] = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (!userData) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const { name, description } = validation.data;

    const result = await db.transaction(async (tx) => {
      const [insertedGroup] = await tx
        .insert(group)
        .values({
          name,
          description: description ?? null,
          ownerId: userData.id,
        })
        .returning();

      await tx.insert(groupMember).values({
        userId: userData.id,
        groupId: insertedGroup.id,
      });

      return insertedGroup;
    });

    return Response.json({ group: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}