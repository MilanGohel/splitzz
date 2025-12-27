import { activity, db, groupMember } from "@/db/schema";
import { auth } from "@/utils/auth";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(request: Request) {
    // Verify if the user logged in or not
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Fetch all the recent activities from the groups in which user belongs to
    const userGroups = await db.select().from(groupMember).where(
        eq(groupMember.userId, session.user.id)
    );

    const groupIds = userGroups.map((ug) => ug.groupId);

    if (groupIds.length === 0) {
        return Response.json({
            activities: [],
            pagination: {
                limit,
                offset,
                total: 0
            }
        });
    }

    // Fetch all the activities from the groups
    const activities = await db.query.activity.findMany({
        where: inArray(activity.groupId, groupIds),
        orderBy: desc(activity.createdAt),
        with: {
            group: {
                columns: {
                    name: true,
                }
            },
            user: {
                columns: {
                    name: true
                }
            }
        },
        limit,
        offset,
    });

    const [totalResult] = await db.select({ count: sql<number>`count(*)` })
        .from(activity)
        .where(inArray(activity.groupId, groupIds));

    return Response.json({
        activities,
        pagination: {
            limit,
            offset,
            total: totalResult?.count || 0
        }
    })

}