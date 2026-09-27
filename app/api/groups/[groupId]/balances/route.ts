import { resolveGroupScope } from "@/lib/auth/scope";
import { getGroupBalances } from "@/lib/ledger";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const scope = await resolveGroupScope(request, groupId);
  if (!scope.ok) return scope.response;

  const balances = await getGroupBalances(scope.group.id);
  return NextResponse.json({ balances });
}
