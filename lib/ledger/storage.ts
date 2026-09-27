import { db, expense, group, groupMember, settlement } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RawExpense, RawSettlement, UserSummary } from "./types";

export interface GroupLedgerSnapshot {
  group: {
    id: number;
    name: string;
    currency: string;
    simplifyDebts: boolean;
  } | null;
  members: UserSummary[];
  expenses: RawExpense[];
  settlements: RawSettlement[];
}

/**
 * Storage adapter retrieving flat relational data for group financial processing.
 */
export async function fetchGroupLedgerSnapshot(
  groupId: number
): Promise<GroupLedgerSnapshot> {
  const [groupData, memberRows, expenseRows, settlementRows] =
    await Promise.all([
      db.query.group.findFirst({
        where: eq(group.id, groupId),
      }),
      db.query.groupMember.findMany({
        where: eq(groupMember.groupId, groupId),
        with: { user: true },
      }),
      db.query.expense.findMany({
        where: eq(expense.groupId, groupId),
        with: { shares: true },
      }),
      db.query.settlement.findMany({
        where: eq(settlement.groupId, groupId),
      }),
    ]);

  if (!groupData) {
    return {
      group: null,
      members: [],
      expenses: [],
      settlements: [],
    };
  }

  const members: UserSummary[] = memberRows
    .filter((m: any) => Boolean(m.user))
    .map((m: any) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image ?? null,
    }));

  const expenses: RawExpense[] = expenseRows.map((e: any) => ({
    id: e.id,
    paidBy: e.paidBy,
    totalAmount: e.totalAmount,
    shares: (e.shares || []).map((s: any) => ({
      userId: s.userId,
      shareAmount: s.shareAmount,
    })),
  }));

  const settlements: RawSettlement[] = settlementRows.map((s: any) => ({
    id: s.id,
    fromUserId: s.fromUserId,
    toUserId: s.toUserId,
    amount: s.amount,
  }));

  return {
    group: {
      id: groupData.id,
      name: groupData.name,
      currency: groupData.currency || "INR",
      simplifyDebts: Boolean(groupData.simplifyDebts),
    },
    members,
    expenses,
    settlements,
  };
}
