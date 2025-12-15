/**
 * Group (Trip) Tests
 * 
 * These tests verify group creation and management functionality.
 * Core invariants:
 * - Group must have at least 1 member
 * - Owner is auto-added as member
 * - Only members can view group
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
    description?: string;
    ownerId: string;
    memberIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface CreateGroupInput {
    name: string;
    description?: string;
    ownerId: string;
}

// Result types for pure functions
type Result<T, E = Error> =
    | { success: true; data: T }
    | { success: false; error: E };

// Pure function to create a group
function createGroup(input: CreateGroupInput): Result<Group, string> {
    if (!input.name || input.name.trim().length === 0) {
        return { success: false, error: 'Group name is required' };
    }

    if (!input.ownerId) {
        return { success: false, error: 'Owner ID is required' };
    }

    const group: Group = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        description: input.description?.trim(),
        ownerId: input.ownerId,
        memberIds: [input.ownerId], // Owner is automatically added as member
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    return { success: true, data: group };
}

// Pure function to check if user can access group
function canAccessGroup(userId: string, group: Group): boolean {
    return group.memberIds.includes(userId);
}

// Pure function to check if user is owner
function isGroupOwner(userId: string, group: Group): boolean {
    return group.ownerId === userId;
}

// Pure function to validate group has at least one member
function hasMinimumMembers(group: Group): boolean {
    return group.memberIds.length >= 1;
}

// Pure function to get member count
function getMemberCount(group: Group): number {
    return group.memberIds.length;
}

describe('Group Management', () => {
    let testOwner: User;
    let testUser: User;

    beforeEach(() => {
        testOwner = {
            id: 'owner-123',
            email: 'owner@example.com',
            name: 'Group Owner',
        };

        testUser = {
            id: 'user-456',
            email: 'user@example.com',
            name: 'Regular User',
        };
    });

    describe('Group Creation', () => {
        it('creates group with owner as member', () => {
            const result = createGroup({
                name: 'Trip to Goa',
                description: 'Beach vacation expenses',
                ownerId: testOwner.id,
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('Trip to Goa');
                expect(result.data.description).toBe('Beach vacation expenses');
                expect(result.data.ownerId).toBe(testOwner.id);
                expect(result.data.memberIds).toContain(testOwner.id);
                expect(getMemberCount(result.data)).toBe(1);
                expect(hasMinimumMembers(result.data)).toBe(true);
            }
        });

        it('creates group without description', () => {
            const result = createGroup({
                name: 'Dinner Group',
                ownerId: testOwner.id,
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('Dinner Group');
                expect(result.data.description).toBeUndefined();
            }
        });

        it('rejects group creation without name', () => {
            const result = createGroup({
                name: '',
                ownerId: testOwner.id,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Group name is required');
            }
        });

        it('rejects group creation without owner', () => {
            const result = createGroup({
                name: 'Orphan Group',
                ownerId: '',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Owner ID is required');
            }
        });

        it('trims whitespace from group name', () => {
            const result = createGroup({
                name: '  Padded Name  ',
                ownerId: testOwner.id,
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('Padded Name');
            }
        });

        it('generates unique group ID', () => {
            const result1 = createGroup({ name: 'Group 1', ownerId: testOwner.id });
            const result2 = createGroup({ name: 'Group 2', ownerId: testOwner.id });

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            if (result1.success && result2.success) {
                expect(result1.data.id).not.toBe(result2.data.id);
            }
        });

        it('sets creation and update timestamps', () => {
            const beforeCreation = new Date();
            const result = createGroup({ name: 'Timed Group', ownerId: testOwner.id });
            const afterCreation = new Date();

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
                expect(result.data.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
                expect(result.data.updatedAt.getTime()).toBe(result.data.createdAt.getTime());
            }
        });
    });

    describe('Group Access Control', () => {
        it('allows owner to access group', () => {
            const result = createGroup({ name: 'Private Group', ownerId: testOwner.id });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(canAccessGroup(testOwner.id, result.data)).toBe(true);
            }
        });

        it('prevents non-members from accessing group', () => {
            const result = createGroup({ name: 'Exclusive Group', ownerId: testOwner.id });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(canAccessGroup(testUser.id, result.data)).toBe(false);
            }
        });

        it('correctly identifies group owner', () => {
            const result = createGroup({ name: 'Owned Group', ownerId: testOwner.id });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(isGroupOwner(testOwner.id, result.data)).toBe(true);
                expect(isGroupOwner(testUser.id, result.data)).toBe(false);
            }
        });
    });

    describe('Group Invariants', () => {
        it('ensures group always has at least one member (the owner)', () => {
            const result = createGroup({ name: 'Min Members Group', ownerId: testOwner.id });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(hasMinimumMembers(result.data)).toBe(true);
                expect(result.data.memberIds.length).toBeGreaterThanOrEqual(1);
            }
        });

        it('owner is always in the member list', () => {
            const result = createGroup({ name: 'Owner Included', ownerId: testOwner.id });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.memberIds).toContain(result.data.ownerId);
            }
        });
    });
});
