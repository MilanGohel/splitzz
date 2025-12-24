import { activity, db, groupMember } from "@/db/schema";
import { isGroupMember } from "@/lib/helpers/checks";
import { ACTIVITY_TYPES } from "@/lib/zod/activity";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const groupIdInt = parseInt(groupId);

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groupFound = await db.query.group.findFirst({
      where: (g, { eq }) => eq(g.id, groupIdInt),
    });

    if (!groupFound) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    if (!(await isGroupMember(session.user.id, groupIdInt))) {
      return Response.json(
        {
          error:
            "You are not a member of this group. You can't see members of this group.",
        },
        { status: 401 }
      );
    }

    const result = await db.query.groupMember.findMany({
      where: (gm, { eq }) => eq(gm.groupId, groupIdInt),
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const groupIdInt = parseInt(groupId);

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groupFound = await db.query.group.findFirst({
      where: (g, { eq }) => eq(g.id, groupIdInt),
    });
    if (!groupFound) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    if (!(await isGroupMember(session.user.id, groupIdInt))) {
      return Response.json(
        {
          error: "You are not a member of this group. You can't add new user.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    let { userId, email } = body;

    let userFound;
    if (email && !userId) {
      userFound = await db.query.user.findFirst({
        where: (u, { eq }) => eq(u.email, email),
      });
      if (!userFound) {
        return Response.json(
          { error: "User with this email not found." },
          { status: 404 }
        );
      }
      userId = userFound.id;
    }

    if (!userId) {
      return Response.json(
        { error: "User ID or Email is required." },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMember = await db.query.groupMember.findFirst({
      where: (gm, { and, eq }) =>
        and(eq(gm.groupId, groupIdInt), eq(gm.userId, userId)),
    });

    if (existingMember) {
      return Response.json(
        { error: "User is already a member of this group." },
        { status: 409 }
      );
    }

    const result = await db
      .insert(groupMember)
      .values({
        groupId: groupIdInt,
        userId,
      })
      .returning();

    await db.insert(activity).values({
      type: ACTIVITY_TYPES.GROUP_JOIN,
      groupId: groupIdInt,
      userId: session.user.id,
      metadata: {
        userId,
        name: userFound?.name,
        email: userFound?.email,
      },
    });

    return Response.json(
      {
        member: {
          id: userFound?.id,
          name: userFound?.name,
          email: userFound?.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error fetching members:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
