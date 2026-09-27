/**
 * Members API Unit Tests (Fully Mocked)
 * 
 * Tests for:
 * - GET /api/groups/[groupId]/members
 * - POST /api/groups/[groupId]/members
 * - DELETE /api/groups/[groupId]/members/[memberId]
 */

import { NextResponse } from 'next/server';

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
            user: { findFirst: jest.fn() },
        },
    };

    return {
        db: mockDb,
        groupMember: { groupId: 'group_id', userId: 'user_id' },
        user: { id: 'id' },
        group: { id: 'id', ownerId: 'owner_id' },
        activity: {},
    };
});

jest.mock('@/lib/auth/scope', () => ({
    resolveGroupScope: jest.fn(),
    isGroupMember: jest.fn(),
}));

jest.mock('@/lib/ledger', () => ({
    getGroupDebts: jest.fn(),
}));

import { GET, POST } from '@/app/api/groups/[groupId]/members/route';
import { DELETE } from '@/app/api/groups/[groupId]/members/[memberId]/route';
import { db } from '@/db/schema';
import { resolveGroupScope, isGroupMember } from '@/lib/auth/scope';
import { getGroupDebts } from '@/lib/ledger';

const mockDb = db as jest.Mocked<typeof db>;
const mockResolveGroupScope = resolveGroupScope as jest.Mock;
const mockIsGroupMember = isGroupMember as jest.Mock;
const mockGetGroupDebts = getGroupDebts as jest.Mock;

describe('Members API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveGroupScope.mockResolvedValue({
            ok: true,
            user: { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
            group: { id: 1, name: 'Group 1', ownerId: 'owner-1', simplifyDebts: false },
            role: 'member',
        });
        mockIsGroupMember.mockResolvedValue(true);
        mockGetGroupDebts.mockResolvedValue([]);
    });

    describe('GET /api/groups/[groupId]/members', () => {
        it('returns 401 when not authenticated', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            });

            const request = new Request('http://localhost/api/groups/1/members');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(401);
        });

        it('returns 404 when group not found', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Group not found' }, { status: 404 }),
            });

            const request = new Request('http://localhost/api/groups/1/members');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(404);
        });

        it('returns 403 when user is not a member', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 }),
            });

            const request = new Request('http://localhost/api/groups/1/members');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(403);
        });

        it('returns members when authorized', async () => {
            (mockDb.query.groupMember.findMany as jest.Mock).mockResolvedValueOnce([
                { user: { id: 'user-1', name: 'User 1', email: 'user1@example.com' } },
                { user: { id: 'user-2', name: 'User 2', email: 'user2@example.com' } },
            ]);

            const request = new Request('http://localhost/api/groups/1/members');
            const response = await GET(request, { params: Promise.resolve({ groupId: '1' }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.members).toHaveLength(2);
        });
    });

    describe('POST /api/groups/[groupId]/members', () => {
        it('returns 401 when not authenticated', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            });

            const request = new Request('http://localhost/api/groups/1/members', {
                method: 'POST',
                body: JSON.stringify({ userId: 'user-2' }),
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

            const request = new Request('http://localhost/api/groups/1/members', {
                method: 'POST',
                body: JSON.stringify({ userId: 'user-2' }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(404);
        });

        it('adds member successfully', async () => {
            (mockDb.query.user.findFirst as jest.Mock).mockResolvedValueOnce({
                id: 'user-2',
                name: 'User 2',
                email: 'user2@example.com',
            });
            (mockDb.query.groupMember.findFirst as jest.Mock).mockResolvedValueOnce(null);
            (mockDb.returning as jest.Mock).mockResolvedValueOnce([{ id: 1, groupId: 1, userId: 'user-2' }]);

            const request = new Request('http://localhost/api/groups/1/members', {
                method: 'POST',
                body: JSON.stringify({ email: 'user2@example.com' }),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await POST(request, { params: Promise.resolve({ groupId: '1' }) });

            expect(response.status).toBe(201);
        });
    });

    describe('DELETE /api/groups/[groupId]/members/[memberId]', () => {
        it('returns 401 when not authenticated', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: false,
                response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            });

            const request = new Request('http://localhost/api/groups/1/members/user-2', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: '1', memberId: 'user-2' }),
            });

            expect(response.status).toBe(401);
        });

        it('returns 400 when trying to remove group owner', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: true,
                user: { id: 'owner-1', name: 'Owner' },
                group: { id: 1, name: 'Group 1', ownerId: 'owner-1' },
                role: 'owner',
            });

            const request = new Request('http://localhost/api/groups/1/members/owner-1', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: '1', memberId: 'owner-1' }),
            });

            expect(response.status).toBe(400);
        });

        it('returns 403 when non-owner tries to remove another member', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: true,
                user: { id: 'user-2', name: 'User 2' },
                group: { id: 1, name: 'Group 1', ownerId: 'owner-1' },
                role: 'member',
            });

            const request = new Request('http://localhost/api/groups/1/members/user-3', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: '1', memberId: 'user-3' }),
            });

            expect(response.status).toBe(403);
        });

        it('returns 400 when member has active debts', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: true,
                user: { id: 'owner-1', name: 'Owner' },
                group: { id: 1, name: 'Group 1', ownerId: 'owner-1' },
                role: 'owner',
            });
            mockIsGroupMember.mockResolvedValueOnce(true);
            mockGetGroupDebts.mockResolvedValueOnce([
                { other_user_id: 'owner-1', amount: -5000, other_user_name: 'User 1', other_user_image: null, type: 'PAYABLE' },
            ]);

            const request = new Request('http://localhost/api/groups/1/members/user-2', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: '1', memberId: 'user-2' }),
            });

            expect(response.status).toBe(400);
        });

        it('allows member to remove self when no debts', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: true,
                user: { id: 'user-2', name: 'User 2' },
                group: { id: 1, name: 'Group 1', ownerId: 'owner-1' },
                role: 'member',
            });
            mockIsGroupMember.mockResolvedValueOnce(true);
            mockGetGroupDebts.mockResolvedValueOnce([]);
            ((mockDb as any).returning as jest.Mock).mockResolvedValueOnce([{ userId: 'user-2' }]);

            const request = new Request('http://localhost/api/groups/1/members/user-2', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: '1', memberId: 'user-2' }),
            });

            expect(response.status).toBe(200);
        });

        it('removes member when no debts', async () => {
            mockResolveGroupScope.mockResolvedValueOnce({
                ok: true,
                user: { id: 'owner-1', name: 'Owner' },
                group: { id: 1, name: 'Group 1', ownerId: 'owner-1' },
                role: 'owner',
            });
            mockIsGroupMember.mockResolvedValueOnce(true);
            mockGetGroupDebts.mockResolvedValueOnce([]);
            ((mockDb as any).returning as jest.Mock).mockResolvedValueOnce([{ userId: 'user-2' }]);

            const request = new Request('http://localhost/api/groups/1/members/user-2', { method: 'DELETE' });
            const response = await DELETE(request, {
                params: Promise.resolve({ groupId: '1', memberId: 'user-2' }),
            });

            expect(response.status).toBe(200);
        });
    });
});
