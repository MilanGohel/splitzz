import { db } from "@/db/schema";

import { groupMember } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: number }> }
) {
  try {
    const { groupId } = await params;

    if (isNaN(Number(groupId))) {
      return Response.json({ error: "Invalid Group ID" }, { status: 400 });
    }

    const result = await db.query.groupMember.findMany({
      where: (gm, { eq }) => eq(gm.groupId, Number(groupId)),
      with: {
        user: true, 
      },
    });

    return Response.json({
      members: result.map((r) => ({
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        image: r.user.image,
      })),
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}