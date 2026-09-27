export type SplitMethod = "equal" | "unequal" | "percentage" | "shares";

export interface ShareAllocation {
  userId: string;
  shareAmount: number; // Decimal currency units (e.g., 33.34)
  cents: number; // Integer cents (e.g., 3334)
}

export interface SplitInput {
  totalAmount: number; // Decimal currency units (e.g., 100.00)
  method: SplitMethod;
  memberIds: string[];
  values?: Record<string, number>; // Exact amounts, percentages, or ratio shares
}

export interface UserSummary {
  id: string;
  name: string;
  image: string | null;
}

export interface RawExpenseShare {
  userId: string;
  shareAmount: number; // Integer cents
}

export interface RawExpense {
  id: number;
  paidBy: string;
  totalAmount: number; // Integer cents
  shares: RawExpenseShare[];
}

export interface RawSettlement {
  id: number;
  fromUserId: string;
  toUserId: string;
  amount: number; // Integer cents
}

export interface NetBalance {
  userId: string;
  name: string;
  image: string | null;
  amount: number; // Integer cents (positive for credit, negative for debit)
  net_balance: number; // Matches legacy field format (in cents)
  currency: string;
  type: "RECEIVABLE" | "PAYABLE";
}

export interface SimplifiedDebt {
  debterId: string;
  debterName: string;
  debterImage: string | null;
  creditorId: string;
  creditorName: string;
  creditorImage: string | null;
  amount: number; // Integer cents
}

export interface UserDebt {
  other_user_id: string;
  other_user_name: string;
  other_user_image: string | null;
  amount: number; // Integer cents (negative if PAYABLE, positive if RECEIVABLE)
  type: "PAYABLE" | "RECEIVABLE";
}
