import {
  NetBalance,
  RawExpense,
  RawSettlement,
  SimplifiedDebt,
  UserDebt,
  UserSummary,
} from "./types";

/**
 * Greedy 2-pointer debt simplification algorithm.
 * Transforms an N-member balance graph into a minimal set of transactions (at most N-1 transactions).
 */
export function simplifyGroupDebts(netBalances: NetBalance[]): SimplifiedDebt[] {
  // Clone balances to avoid mutating inputs
  const debtors = netBalances
    .filter((nb) => nb.net_balance < 0)
    .map((nb) => ({ ...nb, remaining: Math.abs(nb.net_balance) }))
    .sort((a, b) => b.remaining - a.remaining); // Largest debt first

  const creditors = netBalances
    .filter((nb) => nb.net_balance > 0)
    .map((nb) => ({ ...nb, remaining: nb.net_balance }))
    .sort((a, b) => b.remaining - a.remaining); // Largest credit first

  let d = 0;
  let c = 0;
  const simplified: SimplifiedDebt[] = [];

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      simplified.push({
        debterId: debtor.userId,
        debterName: debtor.name,
        debterImage: debtor.image,
        creditorId: creditor.userId,
        creditorName: creditor.name,
        creditorImage: creditor.image,
        amount,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining === 0) d++;
    if (creditor.remaining === 0) c++;
  }

  return simplified;
}

/**
 * Filters simplified debts for a specific user to produce actionable UserDebt entries.
 */
export function filterDebtsForUser(
  simplifiedDebts: SimplifiedDebt[],
  userId: string
): UserDebt[] {
  return simplifiedDebts
    .filter((deb) => deb.debterId === userId || deb.creditorId === userId)
    .map((deb) => {
      const isDebtor = deb.debterId === userId;
      return {
        other_user_id: isDebtor ? deb.creditorId : deb.debterId,
        other_user_name: isDebtor ? deb.creditorName : deb.debterName,
        other_user_image: isDebtor ? deb.creditorImage : deb.debterImage,
        amount: isDebtor ? -deb.amount : deb.amount,
        type: isDebtor ? "PAYABLE" : "RECEIVABLE",
      };
    });
}

/**
 * Computes direct pairwise bilateral debts for a user when debt simplification is turned OFF.
 */
export function computeDirectDebtsForUser(
  userId: string,
  members: UserSummary[],
  expenses: RawExpense[],
  settlements: RawSettlement[]
): UserDebt[] {
  const memberMap = new Map<string, UserSummary>();
  for (const m of members) {
    memberMap.set(m.id, m);
  }

  // Map otherUserId -> net balance from current user's perspective
  const bilateralMap = new Map<string, number>();

  const addAmount = (otherId: string, delta: number) => {
    if (otherId === userId) return;
    const current = bilateralMap.get(otherId) ?? 0;
    bilateralMap.set(otherId, current + delta);
  };

  for (const exp of expenses) {
    if (exp.paidBy === userId) {
      // Current user paid: others owe current user their share amounts
      for (const share of exp.shares) {
        if (share.userId !== userId) {
          addAmount(share.userId, share.shareAmount);
        }
      }
    } else {
      // Someone else paid: if current user had a share, current user owes the payer
      const myShare = exp.shares.find((s) => s.userId === userId);
      if (myShare) {
        addAmount(exp.paidBy, -myShare.shareAmount);
      }
    }
  }

  for (const s of settlements) {
    if (s.fromUserId === userId) {
      // Current user paid other user: current user's balance with them increases (less debt / more credit)
      addAmount(s.toUserId, s.amount);
    } else if (s.toUserId === userId) {
      // Other user paid current user: other user's debt decreases
      addAmount(s.fromUserId, -s.amount);
    }
  }

  const result: UserDebt[] = [];
  for (const [otherId, balance] of bilateralMap.entries()) {
    if (Math.abs(balance) > 0) {
      const other = memberMap.get(otherId) || {
        id: otherId,
        name: "Unknown",
        image: null,
      };
      result.push({
        other_user_id: otherId,
        other_user_name: other.name,
        other_user_image: other.image,
        amount: balance,
        type: balance > 0 ? "RECEIVABLE" : "PAYABLE",
      });
    }
  }

  return result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}
