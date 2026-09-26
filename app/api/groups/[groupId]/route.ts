import { db, group, expense, groupMember } from "@/db/schema";
import { eq, getTableColumns, sql, desc } from "drizzle-orm";
import { isGroupMember } from "@/lib/helpers/checks";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const groupIdInt = parseInt(groupId);
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!await isGroupMember(session.user.id, groupIdInt)) {
        return Response.json({ error: "You are not a member of this group." }, { status: 403 });
    }

    const url = new URL(request.url);
    const isFull = url.searchParams.get("full") === "true";

    if (!isFull) {
        // Standard single group detail fetch
        const [groupData] = await db
            .select({
                ...getTableColumns(group),
                totalSpent: sql<number>`coalesce(sum(${expense.totalAmount}), 0)`.mapWith(Number)
            })
            .from(group)
            .leftJoin(expense, eq(group.id, expense.groupId))
            .where(eq(group.id, groupIdInt))
            .groupBy(group.id)
            .limit(1);

        if (!groupData) {
            return Response.json({ error: "Group not found" }, { status: 404 });
        }

        return Response.json({ group: groupData });
    }

    // Consolidated full fetch: group + members + recent expenses + pagination
    const [groupDataResult, membersResult, expensesResult, totalCountResult] = await Promise.all([
        db
            .select({
                ...getTableColumns(group),
                totalSpent: sql<number>`coalesce(sum(${expense.totalAmount}), 0)`.mapWith(Number)
            })
            .from(group)
            .leftJoin(expense, eq(group.id, expense.groupId))
            .where(eq(group.id, groupIdInt))
            .groupBy(group.id)
            .limit(1),

        db.query.groupMember.findMany({
            where: (gm, { eq }) => eq(gm.groupId, groupIdInt),
            with: {
                user: true,
            },
        }),

        db.query.expense.findMany({
            where: eq(expense.groupId, groupIdInt),
            orderBy: desc(expense.createdAt),
            limit: 20,
            offset: 0,
            with: {
                paidBy: true,
                shares: true,
            },
        }),

        db
            .select({ count: sql<number>`count(*)` })
            .from(expense)
            .where(eq(expense.groupId, groupIdInt)),
    ]);

    const groupData = groupDataResult[0];
    if (!groupData) {
        return Response.json({ error: "Group not found" }, { status: 404 });
    }

    const members = membersResult.map((r) => ({
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        image: r.user.image,
    }));

    return Response.json({
        group: groupData,
        members,
        expenses: expensesResult,
        pagination: {
            limit: 20,
            offset: 0,
            total: Number(totalCountResult[0]?.count || 0),
        },
    });
}