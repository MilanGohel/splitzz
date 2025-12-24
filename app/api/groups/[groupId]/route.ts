import { db, group } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    // Fetch group details from the database
    const [groupData] = await db.select().from(group).where(eq(group.id, groupIdInt)).limit(1);

    if (!groupData) {
        return Response.json({ error: "Group not found" }, { status: 404 });
    }

    return new Response(
        JSON.stringify({ group: groupData }),
        {
            status: 200,
            headers: { "Content-Type": "application/json" }
        }
    );
}