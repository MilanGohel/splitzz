import { computeGroupBalances } from "./balances";
import {
  computeDirectDebtsForUser,
  filterDebtsForUser,
  simplifyGroupDebts,
} from "./simplification";
import { fetchGroupLedgerSnapshot } from "./storage";
import { NetBalance, UserDebt } from "./types";

export * from "./types";
export * from "./splits";
export * from "./balances";
export * from "./simplification";
export * from "./storage";

/**
 * High-level domain operation: Fetch group transactions and compute member net balances.
 */
export async function getGroupBalances(groupId: number): Promise<NetBalance[]> {
  const snapshot = await fetchGroupLedgerSnapshot(groupId);
  if (!snapshot.group) return [];

  return computeGroupBalances(
    snapshot.members,
    snapshot.expenses,
    snapshot.settlements,
    snapshot.group.currency
  );
}

/**
 * High-level domain operation: Fetch group transactions and compute debts for a user
 * based on whether group debt simplification is enabled or disabled.
 */
export async function getGroupDebts(
  groupId: number,
  userId: string
): Promise<UserDebt[]> {
  const snapshot = await fetchGroupLedgerSnapshot(groupId);
  if (!snapshot.group) return [];

  if (snapshot.group.simplifyDebts) {
    const balances = computeGroupBalances(
      snapshot.members,
      snapshot.expenses,
      snapshot.settlements,
      snapshot.group.currency
    );
    const simplified = simplifyGroupDebts(balances);
    return filterDebtsForUser(simplified, userId);
  }

  return computeDirectDebtsForUser(
    userId,
    snapshot.members,
    snapshot.expenses,
    snapshot.settlements
  );
}
