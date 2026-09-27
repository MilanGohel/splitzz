import { NetBalance, RawExpense, RawSettlement, UserSummary } from "./types";

/**
 * Computes net balances for all members in a group from raw transactions.
 * Formula: (Total Expenses Paid + Settlements Sent) - (Total Shares Consumed + Settlements Received)
 * Invariant: Sum of all member balances is strictly zero.
 */
export function computeGroupBalances(
  members: UserSummary[],
  expenses: RawExpense[],
  settlements: RawSettlement[],
  currency: string = "INR"
): NetBalance[] {
  const memberMap = new Map<string, UserSummary>();
  const balanceMap = new Map<string, number>();

  for (const member of members) {
    memberMap.set(member.id, member);
    balanceMap.set(member.id, 0);
  }

  // 1. Process Expenses
  for (const exp of expenses) {
    // Payer is credited the total amount they fronted
    const payerBalance = balanceMap.get(exp.paidBy) ?? 0;
    balanceMap.set(exp.paidBy, payerBalance + exp.totalAmount);

    // Each consumer is debited their share
    for (const share of exp.shares) {
      const current = balanceMap.get(share.userId) ?? 0;
      balanceMap.set(share.userId, current - share.shareAmount);
    }
  }

  // 2. Process Settlements
  for (const s of settlements) {
    // Payer sent money -> credit (reduces what they owe)
    const fromBalance = balanceMap.get(s.fromUserId) ?? 0;
    balanceMap.set(s.fromUserId, fromBalance + s.amount);

    // Payee received money -> debit (reduces what is owed to them)
    const toBalance = balanceMap.get(s.toUserId) ?? 0;
    balanceMap.set(s.toUserId, toBalance - s.amount);
  }

  // 3. Format output sorted by net balance descending (creditors first)
  const result: NetBalance[] = members.map((m) => {
    const net = balanceMap.get(m.id) ?? 0;
    return {
      userId: m.id,
      name: m.name,
      image: m.image,
      amount: net,
      net_balance: net,
      currency,
      type: net >= 0 ? "RECEIVABLE" : "PAYABLE",
    };
  });

  return result.sort((a, b) => b.amount - a.amount);
}
