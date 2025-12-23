import { db, expense, settlement } from "@/db/schema";
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
        return Response.json({ error: "You are not a member of this group. You can't view settlements." }, { status: 403 });
    }

    // Fetch group details from the database
    const settlements = await db.select().from(settlement).where(eq(settlement.groupId, groupIdInt));

    return new Response(
        JSON.stringify({ settlements }),
        {
            status: 200,
            headers: { "Content-Type": "application/json" }
        }
    );
}