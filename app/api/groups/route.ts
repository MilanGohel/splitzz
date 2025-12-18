import { db, group, groupMember, user } from "@/db/schema";
import { groupInsertSchema } from "@/lib/zod/group";
import { auth } from "@/utils/auth"
import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers"
import { z } from "zod";

export async function GET(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    const userEmail = session?.user?.email;

    const userData = await db.select().from(user).where(eq(user.email, userEmail!)).limit(1);

    if (!userData || userData.length === 0) {
        return new Response(
            JSON.stringify({ error: "User not found" }),
            {
                status: 404, headers: { "Content-Type": "application/json" }
            }
        );
    }

    const userGroups = await db.select().from(groupMember).where(eq(groupMember.userId, userData[0].id));

    const groupIds = userGroups.map((gm) => gm.groupId);

    const groups = await db.select().from(group).where(inArray(group.id, groupIds));

    return new Response(
        JSON.stringify({ groups }),
        {
            status: 200,
            headers: { "Content-Type": "application/json" }
        }
    )
}


export async function POST(request: Request) {
    const body = await request.json();

    const validation = await groupInsertSchema.safeParseAsync(body);
    if (!validation.success) {
        return new Response(JSON.stringify({
            error: "Invalid input",
            details: z.treeifyError(validation.error)
        }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { name, description } = validation.data;
    const session = await auth.api.getSession();

    const userEmail = session?.user?.email;
    const userData = await db.select().from(user).where(eq(user.email, userEmail!)).limit(1);
    if (!userData || userData.length === 0) {
        return new Response(
            JSON.stringify({ error: "User not found" }),
            {
                status: 404,
                headers: { "Content-Type": "application/json" }
            }
        );
    }

    type NewGroup = typeof group.$inferInsert;

    const groupInsert: NewGroup = {
        name,
        description: description ?? null,
        ownerId: userData[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const insertedGroup = await db
        .insert(group)
        .values(groupInsert)
        .returning();

    return new Response(
        JSON.stringify({ group: insertedGroup }),
        {
            status: 201,
            headers: { "Content-Type": "application/json" }
        }
    );
}

export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: number }> }) {
    const { groupId } = await params;

    const found = await db.select().from(group).where(eq(group.id, groupId)).limit(1);
    if (!found || found.length === 0) {
        return new Response(
            JSON.stringify({ error: "Group not found" }),
            {
                status: 404,
                headers: { "Content-Type": "application/json" }
            }
        );
    }

    await db.delete(group).where(eq(group.id, groupId));

    return new Response(
        JSON.stringify({ message: "Group deleted successfully" }),
        {
            status: 200,
            headers: { "Content-Type": "application/json" }
        }
    );
}