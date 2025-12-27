import { activity, db, group } from "@/db/schema";
import { isGroupMember } from "@/lib/helpers/checks";
import { ACTIVITY_TYPES } from "@/lib/zod/activity";
import { auth } from "@/utils/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    if (!session?.user.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const groupIdInt = parseInt((await params).groupId);
    if (isNaN(groupIdInt)) {
        return Response.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const groupData = await db.query.group.findFirst({
        where: eq(group.id, groupIdInt)
    });

    if (!await isGroupMember(session.user.id, groupIdInt)) {
        return Response.json({ error: "You are not a member of this group. You can't simplify payments." }, { status: 403 });
    }

    if (!groupData) {
        return Response.json({ error: "Group not found" }, { status: 404 });
    }

    groupData.simplifyDebts = !groupData.simplifyDebts;

    const updatedGroup = await db
        .update(group)
        .set({ simplifyDebts: groupData.simplifyDebts })
        .where(eq(group.id, groupIdInt)).returning();

    await db.insert(activity).values({
        groupId: groupIdInt,
        userId: session.user.id,
        type: ACTIVITY_TYPES.SIMPLIFY_DEBTS,
        metadata: {
            group: updatedGroup,
        }
    })

    return Response.json({ updatedGroup });
}