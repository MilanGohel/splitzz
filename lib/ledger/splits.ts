import { ShareAllocation, SplitInput } from "./types";

/**
 * Pure deterministic share allocation algorithms with penny remainder preservation.
 * Guarantees: sum(shares.cents) === round(totalAmount * 100) for equal, percentage, and shares.
 */

export function calculateEqualSplit(
  totalAmount: number,
  memberIds: string[]
): ShareAllocation[] {
  if (memberIds.length === 0 || totalAmount <= 0) return [];

  const totalCents = Math.round(totalAmount * 100);
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents % memberIds.length;

  return memberIds.map((id, index) => {
    const cents = base + (index < remainder ? 1 : 0);
    return {
      userId: id,
      cents,
      shareAmount: cents / 100,
    };
  });
}

export function calculatePercentageSplit(
  totalAmount: number,
  memberIds: string[],
  percentages: Record<string, number> = {}
): ShareAllocation[] {
  const activeIds = memberIds.filter((id) => (percentages[id] || 0) > 0);
  if (activeIds.length === 0 || totalAmount <= 0) return [];

  const totalCents = Math.round(totalAmount * 100);
  let allocatedCents = 0;

  const allocations = activeIds.map((id) => {
    const percent = percentages[id] || 0;
    const cents = Math.round((totalCents * percent) / 100);
    allocatedCents += cents;
    return { userId: id, cents };
  });

  const remainder = totalCents - allocatedCents;
  if (remainder > 0) {
    for (let i = 0; i < remainder; i++) {
      allocations[i % allocations.length].cents += 1;
    }
  } else if (remainder < 0) {
    for (let i = 0; i < Math.abs(remainder); i++) {
      allocations[i % allocations.length].cents -= 1;
    }
  }

  return allocations.map((a) => ({
    userId: a.userId,
    cents: a.cents,
    shareAmount: a.cents / 100,
  }));
}

export function calculateSharesSplit(
  totalAmount: number,
  memberIds: string[],
  ratios: Record<string, number> = {}
): ShareAllocation[] {
  const activeIds = memberIds.filter((id) => (ratios[id] ?? 1) > 0);
  const totalWeight = activeIds.reduce((sum, id) => sum + (ratios[id] ?? 1), 0);
  if (totalWeight <= 0 || activeIds.length === 0 || totalAmount <= 0) return [];

  const totalCents = Math.round(totalAmount * 100);
  let allocatedCents = 0;

  const allocations = activeIds.map((id) => {
    const weight = ratios[id] ?? 1;
    const cents = Math.round((totalCents * weight) / totalWeight);
    allocatedCents += cents;
    return { userId: id, cents };
  });

  const remainder = totalCents - allocatedCents;
  if (remainder > 0) {
    for (let i = 0; i < remainder; i++) {
      allocations[i % allocations.length].cents += 1;
    }
  } else if (remainder < 0) {
    for (let i = 0; i < Math.abs(remainder); i++) {
      allocations[i % allocations.length].cents -= 1;
    }
  }

  return allocations.map((a) => ({
    userId: a.userId,
    cents: a.cents,
    shareAmount: a.cents / 100,
  }));
}

export function calculateUnequalSplit(
  memberIds: string[],
  amounts: Record<string, number> = {}
): ShareAllocation[] {
  return memberIds
    .filter((id) => (amounts[id] || 0) > 0)
    .map((id) => {
      const val = amounts[id] || 0;
      const cents = Math.round(val * 100);
      return {
        userId: id,
        cents,
        shareAmount: cents / 100,
      };
    });
}

export function allocateShares(input: SplitInput): ShareAllocation[] {
  const { totalAmount, method, memberIds, values = {} } = input;

  switch (method) {
    case "equal":
      return calculateEqualSplit(totalAmount, memberIds);
    case "percentage":
      return calculatePercentageSplit(totalAmount, memberIds, values);
    case "shares":
      return calculateSharesSplit(totalAmount, memberIds, values);
    case "unequal":
      return calculateUnequalSplit(memberIds, values);
    default:
      return calculateEqualSplit(totalAmount, memberIds);
  }
}
