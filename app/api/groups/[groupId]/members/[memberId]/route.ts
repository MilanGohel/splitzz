import { db, groupMember, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function DELETE(request:Request, {params}:{params: Promise<{groupId: number, memberId: string}>}) {
    const {groupId, memberId} = await params;

    const memberTrans = db.select().from(groupMember);

    // query to calculate the userBalance 
    const userBalance = db.select({
        userId: user.id,
        balance: sql<number>`
            COALESCE((SELECT SUM(share_amount) FROM expense_shares WHERE user_id = ${memberId} AND group_id = ${groupId}),0)
            - 
            COALESCE((SELECT SUM(amount) FROM settlements WHERE from_user_id = ${memberId} AND group_id = ${groupId}),0)
        `
    }).from(user).where(eq(user.id, memberId));

    await db.delete(groupMember).where(eq(groupMember.groupId, groupId));

}