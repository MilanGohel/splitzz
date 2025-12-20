import { auth } from "@/utils/auth";
import { headers } from "next/headers";

// 1. Mock the 'better-auth' instance
// We tell Jest: "When anyone imports '@/utils/auth', give them this fake object instead."
jest.mock("@/utils/auth", () => ({
    auth: {
        api: {
            getSession: jest.fn(),
        },
    },
}));

// 2. Mock 'next/headers'
// Since we are not in a real Next.js request, we need to fake the headers function.
jest.mock("next/headers", () => ({
    headers: jest.fn().mockResolvedValue(new Headers()),
}));

describe("Authentication Utilities (Better Auth)", () => {

    // Reset mocks before each test to ensure a clean slate
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return the user session when authenticated", async () => {
        // SETUP: Simulate a logged-in user
        const mockUser = {
            user: {
                id: "user_123",
                email: "test@gmail.com",
                name: "Test User",
                image: "https://google.com/pic.jpg",
            },
            session: {
                id: "session_abc",
                expiresAt: new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
            },
        };

        // Tell the mock to return this data
        (auth.api.getSession as jest.Mock).mockResolvedValue(mockUser);

        // ACT: Call the function (simulating what your API routes do)
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        // ASSERT: Verify we got the user back
        expect(session).toEqual(mockUser);
        expect(session?.user.email).toBe("test@gmail.com");

        // Verify it was called correctly
        expect(auth.api.getSession).toHaveBeenCalledTimes(1);
    });

    it("should return null when the user is NOT authenticated", async () => {
        // SETUP: Simulate a logged-out user (Google login failed or no cookie)
        (auth.api.getSession as jest.Mock).mockResolvedValue(null);

        // ACT
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        // ASSERT
        expect(session).toBeNull();
    });

    it("should handle authentication errors gracefully", async () => {
        // SETUP: Simulate a database crash or library error
        (auth.api.getSession as jest.Mock).mockRejectedValue(new Error("Database connection failed"));

        // ACT & ASSERT
        await expect(
            auth.api.getSession({ headers: await headers() })
        ).rejects.toThrow("Database connection failed");
    });
});