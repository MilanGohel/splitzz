import { activity, db, group } from "@/db/schema";
import { resolveGroupScope } from "@/lib/auth/scope";
import { ACTIVITY_TYPES } from "@/lib/zod/activity";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const scope = await resolveGroupScope(request, groupId);
  if (!scope.ok) return scope.response;
  const groupIdInt = scope.group.id;

  const nextSimplifyDebts = !scope.group.simplifyDebts;

  const updatedGroup = await db
    .update(group)
    .set({ simplifyDebts: nextSimplifyDebts })
    .where(eq(group.id, groupIdInt))
    .returning();

  await db.insert(activity).values({
    groupId: groupIdInt,
    userId: scope.user.id,
    type: ACTIVITY_TYPES.SIMPLIFY_DEBTS,
    metadata: {
      group: updatedGroup,
    },
  });

  return Response.json({ updatedGroup });
}