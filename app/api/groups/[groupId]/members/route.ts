import { db } from "@/db/schema";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: number }> }) {
    const { groupId } = await params;

    const result = await db.query.groupMember.findMany({
        where: (gm, { eq }) => eq(gm.groupId, groupId),
        with: {
            user: true,
        }
    });

    return new Response(
        JSON.stringify({ members: result.map(r => r.user.email) }),
        {
            status: 200,
            headers: { "Content-Type": "application/json" }
        }
    )
}

