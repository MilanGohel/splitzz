/**
 * Settlements API Unit Tests (Fully Mocked)
 * 
 * Tests for:
 * - GET /api/groups/[groupId]/settlements
 * - POST /api/groups/[groupId]/settlements
 */

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
        },
        transaction: jest.fn(),
    };

    return {
        db: mockDb,
        group: { id: 'id' },
        settlement: { groupId: 'group_id' },
        idempotencyKey: {},
    };
});

jest.mock('@/utils/auth', () => ({
    auth: { api: { getSession: jest.fn() } },
}));

jest.mock('next/headers', () => ({
    headers: jest.fn().mockResolvedValue(new Headers()),
}));

jest.mock('@/lib/helpers/checks', () => ({
    isGroupMember: jest.fn(),
}));

import { GET, POST } from '@/app/api/groups/[groupId]/settlements/route';
import { auth } from '@/utils/auth';
import { db } from '@/db/schema';
import { isGroupMember } from '@/lib/helpers/checks';

const mockGetSession = auth.api.getSession as unknown as jest.Mock;
const mockDb = db as jest.Mocked<typeof db>;
const mockIsGroupMember = isGroupMember as jest.Mock;

describe('Settlements API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/groups/[groupId]/settlements', () => {
        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/settlements');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(401);
        });

        it('returns 403 when not a group member', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            mockIsGroupMember.mockResolvedValueOnce(false);

            const request = new Request('http://localhost/api/groups/1/settlements');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(403);
        });

        it('returns 404 when group not found', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            mockIsGroupMember.mockResolvedValueOnce(true);
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/settlements');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(404);
        });

        it('returns settlements when authorized', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            mockIsGroupMember.mockResolvedValueOnce(true);
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
            (mockDb.query.settlement.findMany as jest.Mock).mockResolvedValueOnce([
                { id: 1, fromUserId: 'user-1', toUserId: 'user-2', amount: 5000 },
            ]);

            const request = new Request('http://localhost/api/groups/1/settlements');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

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
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(401);
        });

        it('returns 404 when group not found', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(404);
        });

        it('returns 400 for self-settlement', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
            mockIsGroupMember.mockResolvedValueOnce(true);

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify({ fromUserId: 'user-1', toUserId: 'user-1', amount: 50 }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(400);
        });

        it('returns 403 when settling for others', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-3' } }); // Different user
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
            mockIsGroupMember.mockResolvedValueOnce(true);

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(403);
        });

        it('returns 403 when other user is not a member', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
            mockIsGroupMember
                .mockResolvedValueOnce(true)  // user-1 is member
                .mockResolvedValueOnce(false); // user-2 is NOT member

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(403);
        });

        it('creates settlement successfully', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
            mockIsGroupMember
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true);
            (mockDb.transaction as jest.Mock).mockImplementationOnce(async (fn) => {
                return fn({
                    insert: jest.fn().mockReturnThis(),
                    values: jest.fn().mockReturnThis(),
                    returning: jest.fn().mockResolvedValue([{ id: 1, amount: 5000 }]),
                    onConflictDoNothing: jest.fn().mockReturnThis(),
                });
            });

            const request = new Request('http://localhost/api/groups/1/settlements', {
                method: 'POST',
                body: JSON.stringify(validSettlement),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(201);
        });
    });
});
