import { DashboardDuration, getUserDashboardData, getUserDebts } from "@/lib/helpers/queries";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if (!session?.user.id) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const url = new URL(request.url);
        const duration = url.searchParams.get("duration");

        const data = await getUserDashboardData(session.user.id, duration as DashboardDuration);

        return Response.json({ data }, { status: 200 });
    } catch (error) {
        console.error("Error while fetching dashboard data:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}