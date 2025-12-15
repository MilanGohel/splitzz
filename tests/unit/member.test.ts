/**
 * Member Management Tests
 * 
 * These tests verify member addition/removal and related balance recalculations.
 * Core invariants:
 * - Cannot add same user twice
 * - Non-owner cannot add members (permission check)
 * - Removing member recalculates balances
 */

import { describe, it, expect, beforeEach } from 'bun:test';

// Types
interface User {
    id: string;
    email: string;
    name: string;
}

interface Group {
    id: string;
    name: string;
    ownerId: string;
    memberIds: string[];
}

interface Balance {
    [userId: string]: number; // Positive = owed money, Negative = owes money
}

// Result type
type Result<T, E = string> =
    | { success: true; data: T }
    | { success: false; error: E };

// Pure function to add member to group
function addMember(
    group: Group,
    newMemberId: string,
    requesterId: string
): Result<Group, string> {
    // Check if requester is the owner
    if (group.ownerId !== requesterId) {
        return { success: false, error: 'Only the group owner can add members' };
    }

    // Check if member already exists
    if (group.memberIds.includes(newMemberId)) {
        return { success: false, error: 'User is already a member of this group' };
    }

    // Create new group with added member
    const updatedGroup: Group = {
        ...group,
        memberIds: [...group.memberIds, newMemberId],
    };

    return { success: true, data: updatedGroup };
}

// Pure function to remove member from group
function removeMember(
    group: Group,
    memberIdToRemove: string,
    requesterId: string
): Result<Group, string> {
    // Check if requester is the owner
    if (group.ownerId !== requesterId) {
        return { success: false, error: 'Only the group owner can remove members' };
    }

    // Cannot remove owner
    if (memberIdToRemove === group.ownerId) {
        return { success: false, error: 'Cannot remove the group owner' };
    }

    // Check if member exists
    if (!group.memberIds.includes(memberIdToRemove)) {
        return { success: false, error: 'User is not a member of this group' };
    }

    // Create new group without the member
    const updatedGroup: Group = {
        ...group,
        memberIds: group.memberIds.filter((id) => id !== memberIdToRemove),
    };

    return { success: true, data: updatedGroup };
}

// Pure function to check if user is a member
function isMember(group: Group, userId: string): boolean {
    return group.memberIds.includes(userId);
}

// Pure function to recalculate balances after member removal
// This removes the member's balance and redistributes if needed
function recalculateBalancesAfterRemoval(
    balances: Balance,
    removedMemberId: string,
    remainingMemberIds: string[]
): Result<Balance, string> {
    const removedBalance = balances[removedMemberId] || 0;

    // If the removed member has a non-zero balance, we need to handle it
    // In a real app, you might require settling debts before removal
    if (removedBalance !== 0) {
        return {
            success: false,
            error: 'Cannot remove member with unsettled balance'
        };
    }

    // Create new balances without the removed member
    const newBalances: Balance = {};
    for (const memberId of remainingMemberIds) {
        newBalances[memberId] = balances[memberId] || 0;
    }

    return { success: true, data: newBalances };
}

// Pure function to verify balance invariant (sum = 0)
function verifyBalanceInvariant(balances: Balance): boolean {
    const sum = Object.values(balances).reduce((acc, val) => acc + val, 0);
    return sum === 0;
}

describe('Member Management', () => {
    let owner: User;
    let user1: User;
    let user2: User;
    let user3: User;
    let baseGroup: Group;

    beforeEach(() => {
        owner = { id: 'owner-1', email: 'owner@example.com', name: 'Owner' };
        user1 = { id: 'user-1', email: 'user1@example.com', name: 'User 1' };
        user2 = { id: 'user-2', email: 'user2@example.com', name: 'User 2' };
        user3 = { id: 'user-3', email: 'user3@example.com', name: 'User 3' };

        baseGroup = {
            id: 'group-1',
            name: 'Test Group',
            ownerId: owner.id,
            memberIds: [owner.id],
        };
    });

    describe('Adding Members', () => {
        it('adds existing user to group', () => {
            const result = addMember(baseGroup, user1.id, owner.id);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.memberIds).toContain(user1.id);
                expect(result.data.memberIds.length).toBe(2);
            }
        });

        it('prevents duplicate members', () => {
            // First, add user1
            const firstAdd = addMember(baseGroup, user1.id, owner.id);
            expect(firstAdd.success).toBe(true);

            if (firstAdd.success) {
                // Try to add same user again
                const secondAdd = addMember(firstAdd.data, user1.id, owner.id);

                expect(secondAdd.success).toBe(false);
                if (!secondAdd.success) {
                    expect(secondAdd.error).toBe('User is already a member of this group');
                }
            }
        });

        it('prevents non-owner from adding members', () => {
            const result = addMember(baseGroup, user2.id, user1.id);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Only the group owner can add members');
            }
        });

        it('allows adding multiple different users', () => {
            let group = baseGroup;

            const add1 = addMember(group, user1.id, owner.id);
            expect(add1.success).toBe(true);
            if (add1.success) group = add1.data;

            const add2 = addMember(group, user2.id, owner.id);
            expect(add2.success).toBe(true);
            if (add2.success) group = add2.data;

            const add3 = addMember(group, user3.id, owner.id);
            expect(add3.success).toBe(true);
            if (add3.success) {
                expect(add3.data.memberIds.length).toBe(4);
                expect(add3.data.memberIds).toContain(owner.id);
                expect(add3.data.memberIds).toContain(user1.id);
                expect(add3.data.memberIds).toContain(user2.id);
                expect(add3.data.memberIds).toContain(user3.id);
            }
        });
    });

    describe('Removing Members', () => {
        let groupWithMembers: Group;

        beforeEach(() => {
            groupWithMembers = {
                ...baseGroup,
                memberIds: [owner.id, user1.id, user2.id],
            };
        });

        it('removes member from group', () => {
            const result = removeMember(groupWithMembers, user1.id, owner.id);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.memberIds).not.toContain(user1.id);
                expect(result.data.memberIds.length).toBe(2);
            }
        });

        it('prevents removing non-member', () => {
            const result = removeMember(groupWithMembers, user3.id, owner.id);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('User is not a member of this group');
            }
        });

        it('prevents removing owner', () => {
            const result = removeMember(groupWithMembers, owner.id, owner.id);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Cannot remove the group owner');
            }
        });

        it('prevents non-owner from removing members', () => {
            const result = removeMember(groupWithMembers, user2.id, user1.id);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Only the group owner can remove members');
            }
        });
    });

    describe('Balance Recalculation After Removal', () => {
        it('recalculates balances after member removal (zero balance)', () => {
            const balances: Balance = {
                [owner.id]: 5000, // Owed ₹50
                [user1.id]: -2500, // Owes ₹25
                [user2.id]: -2500, // Owes ₹25
                [user3.id]: 0, // No balance
            };

            const result = recalculateBalancesAfterRemoval(
                balances,
                user3.id,
                [owner.id, user1.id, user2.id]
            );

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data[user3.id]).toBeUndefined();
                expect(result.data[owner.id]).toBe(5000);
                expect(result.data[user1.id]).toBe(-2500);
                expect(result.data[user2.id]).toBe(-2500);
                expect(verifyBalanceInvariant(result.data)).toBe(true);
            }
        });

        it('prevents removal of member with unsettled positive balance', () => {
            const balances: Balance = {
                [owner.id]: 5000,
                [user1.id]: -5000,
            };

            const result = recalculateBalancesAfterRemoval(
                balances,
                owner.id,
                [user1.id]
            );

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Cannot remove member with unsettled balance');
            }
        });

        it('prevents removal of member with unsettled negative balance', () => {
            const balances: Balance = {
                [owner.id]: 5000,
                [user1.id]: -5000,
            };

            const result = recalculateBalancesAfterRemoval(
                balances,
                user1.id,
                [owner.id]
            );

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Cannot remove member with unsettled balance');
            }
        });

        it('maintains balance invariant after removal', () => {
            const balances: Balance = {
                [owner.id]: 10000,
                [user1.id]: -5000,
                [user2.id]: -5000,
                [user3.id]: 0,
            };

            expect(verifyBalanceInvariant(balances)).toBe(true);

            const result = recalculateBalancesAfterRemoval(
                balances,
                user3.id,
                [owner.id, user1.id, user2.id]
            );

            expect(result.success).toBe(true);
            if (result.success) {
                expect(verifyBalanceInvariant(result.data)).toBe(true);
            }
        });
    });

    describe('Membership Queries', () => {
        it('correctly identifies members', () => {
            const group: Group = {
                ...baseGroup,
                memberIds: [owner.id, user1.id],
            };

            expect(isMember(group, owner.id)).toBe(true);
            expect(isMember(group, user1.id)).toBe(true);
            expect(isMember(group, user2.id)).toBe(false);
        });
    });
});
