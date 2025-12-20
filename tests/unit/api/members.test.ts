/**
 * Members API Unit Tests (Fully Mocked)
 * 
 * Tests for:
 * - GET /api/groups/[groupId]/members
 * - POST /api/groups/[groupId]/members
 * - DELETE /api/groups/[groupId]/members/[memberId]
 */

// Mock database BEFORE imports
jest.mock('@/db/schema', () => {
    const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn(),
        delete: jest.fn().mockReturnThis(),
        query: {
            groupMember: { findFirst: jest.fn(), findMany: jest.fn() },
            group: { findFirst: jest.fn() },
        },
    };

    return {
        db: mockDb,
        groupMember: { groupId: 'group_id', userId: 'user_id' },
        user: { id: 'id' },
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

jest.mock('@/lib/helpers/queries', () => ({
    getUserDebts: jest.fn(),
}));

import { GET, POST } from '@/app/api/groups/[groupId]/members/route';
import { DELETE } from '@/app/api/groups/[groupId]/members/[memberId]/route';
import { auth } from '@/utils/auth';
import { db } from '@/db/schema';
import { isGroupMember } from '@/lib/helpers/checks';
import { getUserDebts } from '@/lib/helpers/queries';

const mockGetSession = auth.api.getSession as unknown as jest.Mock;
const mockDb = db as jest.Mocked<typeof db>;
const mockIsGroupMember = isGroupMember as jest.Mock;
const mockGetUserDebts = getUserDebts as jest.Mock;

describe('Members API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/groups/[groupId]/members', () => {
        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/members');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(401);
        });

        it('returns 404 when group not found', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/members');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(404);
        });

        it('returns 401 when user is not a member', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
            mockIsGroupMember.mockResolvedValueOnce(false);

            const request = new Request('http://localhost/api/groups/1/members');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(401);
        });

        it('returns members when authorized', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
            mockIsGroupMember.mockResolvedValueOnce(true);
            (mockDb.query.groupMember.findMany as jest.Mock).mockResolvedValueOnce([
                { user: { id: 'user-1', name: 'User 1', email: 'user1@test.com', image: null } },
                { user: { id: 'user-2', name: 'User 2', email: 'user2@test.com', image: null } },
            ]);

            const request = new Request('http://localhost/api/groups/1/members');
            const response = await GET(request, { params: Promise.resolve({ groupId: 1 }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.members).toHaveLength(2);
        });
    });

    describe('POST /api/groups/[groupId]/members', () => {
        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/members', {
                method: 'POST',
                body: JSON.stringify({ userId: 'user-2' }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(401);
        });

        it('returns 404 when group not found', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/members', {
                method: 'POST',
                body: JSON.stringify({ userId: 'user-2' }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(404);
        });

        it('adds member successfully', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            (mockDb.query.group.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
            mockIsGroupMember.mockResolvedValueOnce(true);
            ((mockDb as any).returning as jest.Mock).mockResolvedValueOnce([{ groupId: 1, userId: 'user-2' }]);

            const request = new Request('http://localhost/api/groups/1/members', {
                method: 'POST',
                body: JSON.stringify({ userId: 'user-2' }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: 1 }) });

            expect(response.status).toBe(201);
        });
    });

    describe('DELETE /api/groups/[groupId]/members/[memberId]', () => {
        it('returns 401 when not authenticated', async () => {
            mockGetSession.mockResolvedValueOnce(null);

            const request = new Request('http://localhost/api/groups/1/members/user-2', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: 1, memberId: 'user-2' })
            });

            expect(response.status).toBe(401);
        });

        it('returns 400 when trying to remove self', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            mockIsGroupMember.mockResolvedValueOnce(true);

            const request = new Request('http://localhost/api/groups/1/members/user-1', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: 1, memberId: 'user-1' })
            });

            expect(response.status).toBe(400);
        });

        it('returns 400 when member has active debts', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            mockIsGroupMember
                .mockResolvedValueOnce(true)  // Requester is member
                .mockResolvedValueOnce(true); // Target is member
            mockGetUserDebts.mockResolvedValueOnce([
                { other_user_id: 'user-1', net_balance: -5000, name: 'User 1', image: '' },
            ]);

            const request = new Request('http://localhost/api/groups/1/members/user-2', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: 1, memberId: 'user-2' })
            });

            expect(response.status).toBe(400);
        });

        it('removes member when no debts', async () => {
            mockGetSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
            mockIsGroupMember
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true);
            mockGetUserDebts.mockResolvedValueOnce([]);
            ((mockDb as any).returning as jest.Mock).mockResolvedValueOnce([{ userId: 'user-2' }]);

            const request = new Request('http://localhost/api/groups/1/members/user-2', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: 1, memberId: 'user-2' })
            });

            expect(response.status).toBe(200);
        });
    });
});
