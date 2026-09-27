/**
 * Settlements API Unit Tests (Fully Mocked)
 * 
 * Tests for:
 * - GET /api/groups/[groupId]/settlements
 * - POST /api/groups/[groupId]/settlements
 */

import { NextResponse } from 'next/server';

// Mock database BEFORE imports
jest.mock('@/db/schema', () => {
    const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn(),
        query: {
            group: { findFirst: jest.fn() },
            settlement: { findMany: jest.fn() },
            idempotencyKey: { findFirst: jest.fn() },
        },
        transaction: jest.fn(),
    };

    return {
        db: mockDb,
        group: { id: 'id' },
        settlement: { groupId: 'group_id' },
        idempotencyKey: { key: 'key' },
        activity: {},
    };
});

jest.mock('@/lib/auth/scope', () => ({
    resolveGroupScope: jest.fn(),
    isGroupMember: jest.fn(),
}));

import { GET, POST } from '@/app/api/groups/[groupId]/settlements/route';
import { db } from '@/db/schema';
import { resolveGroupScope, isGroupMember } from '@/lib/auth/scope';

const mockDb = db as jest.Mocked<typeof db>;
const mockResolveGroupScope = resolveGroupScope as jest.Mock;
const mockIsGroupMember = isGroupMember as jest.Mock;

describe('Settlements API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveGroupScope.mockResolvedValue({
            ok: true,
            user: { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
            group: { id: 1, name: 'Group 1', ownerId: 'user-1', simplifyDebts: false },
            role: 'owner',
        });
        mockIsGroupMember.mockResolvedValue(true);
    });

    describe('GET /api/groups/[groupId]/settlements', () => {
        it('returns 401 when not authenticated', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            });

            const request = new Request('http://localhost/api/groups/1/settlements');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(401);
        });

        it('returns 403 when not a group member', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 }),
            });

            const request = new Request('http://localhost/api/groups/1/settlements');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(403);
        });

        it('returns 404 when group not found', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Group not found' }, { status: 404 }),
            });

            const request = new Request('http://localhost/api/groups/1/settlements');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(404);
        });

        it('returns settlements when authorized', async () => {
            (mockDb.query.settlement.findMany as jest.Mock).mockResolvedValueOnce([
                { id: 1, fromUserId: 'user-1', toUserId: 'user-2', amount: 5000 },
            ]);

            const request = new Request('http://localhost/api/groups/1/settlements');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(200);
        });
    });

    describe('POST /api/groups/[groupId]/settlements', () => {
        const validSettlement = {
            fromUserId: 'user-1',
            toUserId: 'user-2',
            amount: 50,
        };

        it('returns 401 when not authenticated', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            });

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(401);
        });

        it('returns 404 when group not found', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Group not found' }, { status: 404 }),
            });

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(404);
        });

        it('returns 400 for self-settlement', async () => {
            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify({
                    fromUserId: 'user-1',
                    toUserId: 'user-1',
                    amount: 50,
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(400);
        });

        it('returns 403 when settling for others', async () => {
            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify({
                    fromUserId: 'user-2',
                    toUserId: 'user-3',
                    amount: 50,
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(403);
        });

        it('returns 403 when other user is not a member', async () => {
            mockIsGroupMember.mockResolvedValueOnce(false);

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(403);
        });

        it('creates settlement successfully', async () => {
            const insertedSettlement = {
                id: 1,
                groupId: 1,
                fromUserId: 'user-1',
                toUserId: 'user-2',
                amount: 5000,
            };

            (mockDb.transaction as jest.Mock).mockImplementationOnce(async (callback) => {
                const tx = {
                    insert: jest.fn().mockReturnValue({
                        values: jest.fn().mockReturnValue({
                            returning: jest.fn().mockResolvedValueOnce([insertedSettlement]),
                        }),
                    }),
                    update: jest.fn().mockReturnValue({
                        set: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValueOnce([]),
                        }),
                    }),
                };
                return callback(tx);
            });

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(201);
        });
    });
});
