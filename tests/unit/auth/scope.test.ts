jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

jest.mock("@/utils/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("@/db/schema", () => ({
  db: {
    query: {
      group: {
        findFirst: jest.fn(),
      },
      groupMember: {
        findFirst: jest.fn(),
      },
    },
  },
  group: { id: "groups.id" },
  groupMember: { groupId: "group_members.group_id", userId: "group_members.user_id" },
}));

import { resolveGroupScope } from "@/lib/auth/scope";
import { auth } from "@/utils/auth";
import { db } from "@/db/schema";

describe("Group Scope Guard - resolveGroupScope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = new Request("http://localhost:3000/api/groups/1/expenses");

  it("returns 400 when groupId is not a valid number", async () => {
    const result = await resolveGroupScope(mockRequest, "invalid-id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const data = await result.response.json();
      expect(data.error).toBe("Invalid group ID");
    }
  });

  it("returns 401 when session is not authenticated", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValueOnce(null);

    const result = await resolveGroupScope(mockRequest, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data.error).toBe("Unauthorized");
    }
  });

  it("returns 404 when group is not found", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValueOnce({
      user: { id: "user-1", name: "Alice", email: "alice@example.com" },
    });
    (db.query.group.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (db.query.groupMember.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const result = await resolveGroupScope(mockRequest, 999);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
      const data = await result.response.json();
      expect(data.error).toBe("Group not found");
    }
  });

  it("returns 403 when user is not a member of the group", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValueOnce({
      user: { id: "user-1", name: "Alice", email: "alice@example.com" },
    });
    (db.query.group.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 1,
      name: "Trip",
      ownerId: "owner-99",
      simplifyDebts: false,
    });
    (db.query.groupMember.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const result = await resolveGroupScope(mockRequest, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const data = await result.response.json();
      expect(data.error).toBe("You are not a member of this group");
    }
  });

  it("returns 403 when requireRole is owner but caller is only a member", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValueOnce({
      user: { id: "user-1", name: "Alice", email: "alice@example.com" },
    });
    (db.query.group.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 1,
      name: "Trip",
      ownerId: "owner-99",
      simplifyDebts: false,
    });
    (db.query.groupMember.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 10,
      groupId: 1,
      userId: "user-1",
    });

    const result = await resolveGroupScope(mockRequest, 1, { requireRole: "owner" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const data = await result.response.json();
      expect(data.error).toBe("Only the group owner can perform this action");
    }
  });

  it("returns ok: true and verified context with owner role", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValueOnce({
      user: { id: "owner-99", name: "Boss", email: "boss@example.com" },
    });
    (db.query.group.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 1,
      name: "Trip",
      ownerId: "owner-99",
      simplifyDebts: true,
      currency: "USD",
    });
    (db.query.groupMember.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 10,
      groupId: 1,
      userId: "owner-99",
    });

    const result = await resolveGroupScope(mockRequest, 1, { requireRole: "owner" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("owner-99");
      expect(result.group.name).toBe("Trip");
      expect(result.group.currency).toBe("USD");
      expect(result.group.simplifyDebts).toBe(true);
      expect(result.role).toBe("owner");
    }
  });
});
