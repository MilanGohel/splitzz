import { db, expense } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request:Request, {params}: {params: Promise<{groupId: number}>}) {
    const { groupId } = await params;

    // Fetch group details from the database
    const expenses = await db.select().from(expense).where(eq(expense.groupId, groupId));

    return new Response(
        JSON.stringify({ expenses }),
        {
            status: 200,
            headers: { "Content-Type": "application/json" }
        }
    );
}