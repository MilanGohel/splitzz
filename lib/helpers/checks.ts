import { db } from "@/db/schema";

export async function isGroupMember(userId: string, groupId: number): Promise<boolean> {
    const member = await db.query.groupMember.findFirst({
        where: (gm, { eq, and }) =>
            and(
                eq(gm.groupId, groupId),
                eq(gm.userId, userId)
            ),
    });

    return !!member;
}