import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { isGroupMember } from "@/lib/helpers/checks";

type RouteContext = { params: Promise<{ groupId?: string }> };

type AuthenticatedHandler = (
    request: Request,
    context: RouteContext,
    props: { userId: string; groupId: number }
) => Promise<Response>;

export function withGroupAuth(handler: AuthenticatedHandler) {
    return async (request: Request, context: RouteContext) => {
        try {
            const resolvedParams = await context.params;
            const groupIdString = resolvedParams?.groupId;

            if (!groupIdString) {
                return Response.json({ error: "Group ID missing" }, { status: 400 });
            }

            const groupId = Number(groupIdString);
            if (isNaN(groupId)) {
                return Response.json({ error: "Invalid Group ID" }, { status: 400 });
            }

            const session = await auth.api.getSession({
                headers: await headers(),
            });

            if (!session?.user?.id) {
                return Response.json({ error: "Unauthorized" }, { status: 401 });
            }

            const isMember = await isGroupMember(session.user.id, groupId);

            if (!isMember) {
                return Response.json(
                    { error: "Access Denied: You are not a member of this group." },
                    { status: 403 }
                );
            }

            return await handler(request, context, {
                userId: session.user.id,
                groupId: groupId
            });

        } catch (error) {
            console.error("API Guard Error:", error);
            return Response.json({ error: "Internal Server Error" }, { status: 500 });
        }
    };
}