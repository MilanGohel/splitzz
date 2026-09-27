import { db, group, expense, groupMember } from "@/db/schema";
import { eq, getTableColumns, sql, desc } from "drizzle-orm";
import { resolveGroupScope } from "@/lib/auth/scope";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const scope = await resolveGroupScope(request, groupId);
    if (!scope.ok) return scope.response;
    const groupIdInt = scope.group.id;

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