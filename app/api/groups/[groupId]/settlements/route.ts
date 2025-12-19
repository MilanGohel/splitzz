import { db, group, settlement } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: number }> }
) {
  const { groupId } = await params;

  const groupData = await db.query.group.findFirst({
    where: eq(group.id, groupId),
  });

  if (!groupData) {
    return Response.json(
      {
        error: "Group not found",
      },
      { status: 404 }
    );
  }

  const settlements = db.query.settlement.findMany({
    where: eq(settlement.groupId, groupId),
  });

  return Response.json(
    {
      settlements,
    },
    { status: 200 }
  );
}
