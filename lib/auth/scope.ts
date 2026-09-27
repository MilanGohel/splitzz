import { db, group, groupMember } from "@/db/schema";
import { auth } from "@/utils/auth";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export interface GroupScopeUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface GroupScopeGroup {
  id: number;
  name: string;
  description: string | null;
  ownerId: string;
  currency: string;
  simplifyDebts: boolean;
}

export type GroupRole = "owner" | "member";

export interface GroupScopeSuccess {
  ok: true;
  user: GroupScopeUser;
  group: GroupScopeGroup;
  role: GroupRole;
}

export interface GroupScopeFailure {
  ok: false;
  response: NextResponse;
}

export type GroupScopeResult = GroupScopeSuccess | GroupScopeFailure;

export interface GroupScopeOptions {
  requireRole?: GroupRole;
}

/**
 * Checks whether a specific user is a registered member of a group.
 */
export async function isGroupMember(
  userId: string,
  groupId: number
): Promise<boolean> {
  const member = await db.query.groupMember.findFirst({
    where: and(
      eq(groupMember.groupId, groupId),
      eq(groupMember.userId, userId)
    ),
  });
  return Boolean(member);
}

/**
 * Deep authentication & authorization guard for group-scoped endpoints.
 * Verifies caller session, group existence, membership, and optional role requirements.
 */
export async function resolveGroupScope(
  request: Request,
  groupId: number | string,
  options?: GroupScopeOptions
): Promise<GroupScopeResult> {
  const groupIdInt =
    typeof groupId === "string" ? parseInt(groupId, 10) : groupId;

  if (isNaN(groupIdInt)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid group ID" },
        { status: 400 }
      ),
    };
  }

  // 1. Session verification
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userId = session.user.id;

  // 2. Parallel single-roundtrip check for group existence and caller membership
  const [groupRecord, memberRecord] = await Promise.all([
    db.query.group.findFirst({
      where: eq(group.id, groupIdInt),
    }),
    db.query.groupMember.findFirst({
      where: and(
        eq(groupMember.groupId, groupIdInt),
        eq(groupMember.userId, userId)
      ),
    }),
  ]);

  if (!groupRecord) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      ),
    };
  }

  if (!memberRecord) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 }
      ),
    };
  }

  const role: GroupRole = groupRecord.ownerId === userId ? "owner" : "member";

  if (options?.requireRole === "owner" && role !== "owner") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only the group owner can perform this action" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    group: {
      id: groupRecord.id,
      name: groupRecord.name,
      description: groupRecord.description,
      ownerId: groupRecord.ownerId,
      currency: groupRecord.currency || "INR",
      simplifyDebts: Boolean(groupRecord.simplifyDebts),
    },
    role,
  };
}
