import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  allocateShares,
} from "@/lib/ledger/splits";
import { computeGroupBalances } from "@/lib/ledger/balances";
import {
  simplifyGroupDebts,
  filterDebtsForUser,
  computeDirectDebtsForUser,
} from "@/lib/ledger/simplification";
import { UserSummary, RawExpense, RawSettlement } from "@/lib/ledger/types";

describe("Financial Ledger - Splits & Penny Remainder Preservation", () => {
  it("divides equal splits and distributes remainder pennies deterministically", () => {
    const shares = calculateEqualSplit(100, ["u1", "u2", "u3"]);
    expect(shares).toHaveLength(3);

    const totalCents = shares.reduce((sum, s) => sum + s.cents, 0);
    expect(totalCents).toBe(10000); // 100.00 INR exactly

    expect(shares[0].cents).toBe(3334);
    expect(shares[1].cents).toBe(3333);
    expect(shares[2].cents).toBe(3333);
    expect(shares[0].shareAmount).toBe(33.34);
    expect(shares[1].shareAmount).toBe(33.33);
    expect(shares[2].shareAmount).toBe(33.33);
  });

  it("handles percentage splits and absorbs rounding remainders", () => {
    // 33.33% each across 3 users on 100 => 3333 + 3333 + 3333 = 9999 + 1 remainder cent
    const shares = calculatePercentageSplit(100, ["u1", "u2", "u3"], {
      u1: 33.333,
      u2: 33.333,
      u3: 33.334,
    });
    const totalCents = shares.reduce((sum, s) => sum + s.cents, 0);
    expect(totalCents).toBe(10000);
  });

  it("handles ratio shares split accurately", () => {
    const shares = calculateSharesSplit(100, ["u1", "u2", "u3"], {
      u1: 2,
      u2: 1,
      u3: 1,
    });
    expect(shares[0].cents).toBe(5000);
    expect(shares[1].cents).toBe(2500);
    expect(shares[2].cents).toBe(2500);
    expect(shares[0].shareAmount).toBe(50.0);
    expect(shares[1].shareAmount).toBe(25.0);
    expect(shares[2].shareAmount).toBe(25.0);
  });

  it("allocateShares correctly delegates to chosen split method", () => {
    const equal = allocateShares({
      totalAmount: 60,
      method: "equal",
      memberIds: ["u1", "u2"],
    });
    expect(equal[0].cents).toBe(3000);
    expect(equal[1].cents).toBe(3000);
  });
});

describe("Financial Ledger - Net Balance Accumulator", () => {
  const members: UserSummary[] = [
    { id: "alice", name: "Alice", image: null },
    { id: "bob", name: "Bob", image: null },
    { id: "charlie", name: "Charlie", image: null },
  ];

  it("computes net balances across expenses and settlements with zero-sum invariant", () => {
    // Alice paid 3000 for lunch (1000 each)
    const expenses: RawExpense[] = [
      {
        id: 1,
        paidBy: "alice",
        totalAmount: 3000,
        shares: [
          { userId: "alice", shareAmount: 1000 },
          { userId: "bob", shareAmount: 1000 },
          { userId: "charlie", shareAmount: 1000 },
        ],
      },
    ];

    // Bob settles 1000 to Alice
    const settlements: RawSettlement[] = [
      {
        id: 1,
        fromUserId: "bob",
        toUserId: "alice",
        amount: 1000,
      },
    ];

    const balances = computeGroupBalances(members, expenses, settlements);

    const aliceBal = balances.find((b) => b.userId === "alice")!;
    const bobBal = balances.find((b) => b.userId === "bob")!;
    const charlieBal = balances.find((b) => b.userId === "charlie")!;

    // Alice: paid 3000 expenses - 1000 share - 1000 settlement received = +1000
    expect(aliceBal.amount).toBe(1000);
    expect(aliceBal.type).toBe("RECEIVABLE");

    // Bob: paid 0 expenses + 1000 settlement sent - 1000 share = 0
    expect(bobBal.amount).toBe(0);

    // Charlie: paid 0 expenses + 0 settlement sent - 1000 share = -1000
    expect(charlieBal.amount).toBe(-1000);
    expect(charlieBal.type).toBe("PAYABLE");

    // Zero-sum invariant: sum of all balances must be 0
    const sum = balances.reduce((acc, b) => acc + b.amount, 0);
    expect(sum).toBe(0);
  });
});

describe("Financial Ledger - Debt Simplification", () => {
  it("simplifies transitive debt graph (A owes B, B owes C => A owes C)", () => {
    // Net balances: A owes 1000 (-1000), B is net 0, C is owed 1000 (+1000)
    const balances = [
      {
        userId: "user-c",
        name: "Charlie",
        image: null,
        amount: 1000,
        net_balance: 1000,
        currency: "INR",
        type: "RECEIVABLE" as const,
      },
      {
        userId: "user-b",
        name: "Bob",
        image: null,
        amount: 0,
        net_balance: 0,
        currency: "INR",
        type: "RECEIVABLE" as const,
      },
      {
        userId: "user-a",
        name: "Alice",
        image: null,
        amount: -1000,
        net_balance: -1000,
        currency: "INR",
        type: "PAYABLE" as const,
      },
    ];

    const simplified = simplifyGroupDebts(balances);

    // Instead of 2 transactions, only 1 transaction is needed
    expect(simplified).toHaveLength(1);
    expect(simplified[0]).toEqual({
      debterId: "user-a",
      debterName: "Alice",
      debterImage: null,
      creditorId: "user-c",
      creditorName: "Charlie",
      creditorImage: null,
      amount: 1000,
    });

    const userADebts = filterDebtsForUser(simplified, "user-a");
    expect(userADebts).toHaveLength(1);
    expect(userADebts[0].other_user_id).toBe("user-c");
    expect(userADebts[0].amount).toBe(-1000);
    expect(userADebts[0].type).toBe("PAYABLE");
  });

  it("cancels circular debts completely", () => {
    // A -> B (1000), B -> C (1000), C -> A (1000) => All net balances are 0
    const balances = [
      {
        userId: "user-a",
        name: "Alice",
        image: null,
        amount: 0,
        net_balance: 0,
        currency: "INR",
        type: "RECEIVABLE" as const,
      },
      {
        userId: "user-b",
        name: "Bob",
        image: null,
        amount: 0,
        net_balance: 0,
        currency: "INR",
        type: "RECEIVABLE" as const,
      },
      {
        userId: "user-c",
        name: "Charlie",
        image: null,
        amount: 0,
        net_balance: 0,
        currency: "INR",
        type: "RECEIVABLE" as const,
      },
    ];

    const simplified = simplifyGroupDebts(balances);
    expect(simplified).toHaveLength(0);
  });

  it("computes direct pairwise debts when simplification is off", () => {
    const members: UserSummary[] = [
      { id: "alice", name: "Alice", image: null },
      { id: "bob", name: "Bob", image: null },
      { id: "charlie", name: "Charlie", image: null },
    ];

    // Alice paid 2000 for Bob
    // Bob paid 1000 for Charlie
    const expenses: RawExpense[] = [
      {
        id: 1,
        paidBy: "alice",
        totalAmount: 2000,
        shares: [
          { userId: "bob", shareAmount: 2000 },
        ],
      },
      {
        id: 2,
        paidBy: "bob",
        totalAmount: 1000,
        shares: [
          { userId: "charlie", shareAmount: 1000 },
        ],
      },
    ];

    const bobDebts = computeDirectDebtsForUser("bob", members, expenses, []);

    // Bob owes Alice 2000, and Charlie owes Bob 1000
    const toAlice = bobDebts.find((d) => d.other_user_id === "alice")!;
    const fromCharlie = bobDebts.find((d) => d.other_user_id === "charlie")!;

    expect(toAlice.type).toBe("PAYABLE");
    expect(toAlice.amount).toBe(-2000);

    expect(fromCharlie.type).toBe("RECEIVABLE");
    expect(fromCharlie.amount).toBe(1000);
  });
});
