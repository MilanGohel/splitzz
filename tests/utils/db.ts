/**
 * Test Database Utilities
 * 
 * Provides utilities for integration tests with real database:
 * - Test data factories
 * - Database cleanup between tests
 * - Helper functions for creating test fixtures
 */

import { db, user, group, groupMember, expense, expenseShare, settlement, idempotencyKey } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ============================================
// Test Data Types
// ============================================

export interface TestUser {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string;
}

export interface TestGroup {
    id: number;
    name: string;
    description?: string;
    ownerId: string;
    simplifyDebts?: boolean;
}

export interface TestExpense {
    id: number;
    groupId: number;
    totalAmount: number;
    description?: string;
    paidBy: string;
}

export interface TestSettlement {
    id: number;
    groupId: number;
    fromUserId: string;
    toUserId: string;
    amount: number;
}

// ============================================
// Factory Functions
// ============================================

let userCounter = 0;
let groupCounter = 0;

/**
 * Create a test user in the database
 */
export async function createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    userCounter++;
    const userData = {
        id: overrides.id ?? `test-user-${userCounter}-${Date.now()}`,
        name: overrides.name ?? `Test User ${userCounter}`,
        email: overrides.email ?? `testuser${userCounter}@example.com`,
        emailVerified: overrides.emailVerified ?? false,
        image: overrides.image ?? null,
    };

    const [inserted] = await db.insert(user).values(userData).returning();
    return inserted as TestUser;
}

/**
 * Create a test group in the database (also adds owner as member)
 */
export async function createTestGroup(ownerId: string, overrides: Partial<Omit<TestGroup, 'id' | 'ownerId'>> = {}): Promise<TestGroup> {
    groupCounter++;
    const groupData = {
        name: overrides.name ?? `Test Group ${groupCounter}`,
        description: overrides.description ?? null,
        ownerId,
        simplifyDebts: overrides.simplifyDebts ?? false,
    };

    const [insertedGroup] = await db.insert(group).values(groupData).returning();

    // Auto-add owner as member
    await db.insert(groupMember).values({
        groupId: insertedGroup.id,
        userId: ownerId,
    });

    return insertedGroup as TestGroup;
}

/**
 * Add a member to a group
 */
export async function addMemberToGroup(groupId: number, userId: string): Promise<void> {
    await db.insert(groupMember).values({
        groupId,
        userId,
    });
}

/**
 * Create a test expense with shares
 */
export async function createTestExpense(
    groupId: number,
    paidBy: string,
    totalAmountCents: number,
    shares: Array<{ userId: string; shareAmountCents: number }>,
    description?: string
): Promise<TestExpense> {
    const [insertedExpense] = await db.insert(expense).values({
        groupId,
        paidBy,
        totalAmount: totalAmountCents,
        description: description ?? null,
    }).returning();

    if (shares.length > 0) {
        await db.insert(expenseShare).values(
            shares.map(s => ({
                expenseId: insertedExpense.id,
                userId: s.userId,
                shareAmount: s.shareAmountCents,
            }))
        );
    }

    return insertedExpense as TestExpense;
}

/**
 * Create a test settlement
 */
export async function createTestSettlement(
    groupId: number,
    fromUserId: string,
    toUserId: string,
    amountCents: number
): Promise<TestSettlement> {
    const [inserted] = await db.insert(settlement).values({
        groupId,
        fromUserId,
        toUserId,
        amount: amountCents,
    }).returning();

    return inserted as TestSettlement;
}

// ============================================
// Cleanup Functions
// ============================================

/**
 * Clean up all test data - call this in afterEach or afterAll
 */
export async function cleanupTestData(): Promise<void> {
    // Delete in order of dependencies (children first)
    await db.delete(idempotencyKey);
    await db.delete(expenseShare);
    await db.delete(expense);
    await db.delete(settlement);
    await db.delete(groupMember);
    await db.delete(group);
    await db.delete(user);

    // Reset counters
    userCounter = 0;
    groupCounter = 0;
}

/**
 * Clean up specific user and their data
 */
export async function cleanupUser(userId: string): Promise<void> {
    await db.delete(expenseShare).where(eq(expenseShare.userId, userId));
    await db.delete(groupMember).where(eq(groupMember.userId, userId));
    await db.delete(settlement).where(eq(settlement.fromUserId, userId));
    await db.delete(settlement).where(eq(settlement.toUserId, userId));
    await db.delete(user).where(eq(user.id, userId));
}

/**
 * Clean up specific group and its data
 */
export async function cleanupGroup(groupId: number): Promise<void> {
    // Get all expenses in the group first
    const expenses = await db.select().from(expense).where(eq(expense.groupId, groupId));

    for (const exp of expenses) {
        await db.delete(expenseShare).where(eq(expenseShare.expenseId, exp.id));
    }

    await db.delete(expense).where(eq(expense.groupId, groupId));
    await db.delete(settlement).where(eq(settlement.groupId, groupId));
    await db.delete(groupMember).where(eq(groupMember.groupId, groupId));
    await db.delete(group).where(eq(group.id, groupId));
}

// ============================================
// Query Helpers
// ============================================

/**
 * Get group members by group ID
 */
export async function getGroupMembers(groupId: number) {
    return db.query.groupMember.findMany({
        where: (gm, { eq }) => eq(gm.groupId, groupId),
        with: { user: true },
    });
}

/**
 * Get expenses by group ID
 */
export async function getGroupExpenses(groupId: number) {
    return db.select().from(expense).where(eq(expense.groupId, groupId));
}

/**
 * Get settlements by group ID
 */
export async function getGroupSettlements(groupId: number) {
    return db.select().from(settlement).where(eq(settlement.groupId, groupId));
}
