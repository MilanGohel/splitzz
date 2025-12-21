
import { db, user } from "@/db/schema";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { like, or } from "drizzle-orm";

export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");

        if (!query || query.length < 3) {
            return Response.json({ users: [] });
        }

        const users = await db.select({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image
        })
            .from(user)
            .where(
                or(
                    like(user.name, `%${query}%`),
                    like(user.email, `%${query}%`)
                )
            )
            .limit(10);

        return Response.json({ users });

    } catch (error) {
        console.error("Error searching users:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
