import { db, group } from "@/db/schema";
import { isGroupMember } from "@/lib/helpers/checks";
import { getNetBalances, getUserDebts } from "@/lib/helpers/queries";
import { auth } from "@/utils/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: number }> }) {
    const { groupId } = await params;

    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groupData = await db.query.group.findFirst({
        where: eq(group.id, groupId),
    });

    if (!groupData) {
        return Response.json({ error: "Group not found" }, { status: 404 });
    }

    if (!await isGroupMember(session.user.id, groupId)) {
        return Response.json({ error: "You are not a member of this group. You can't remove members." }, { status: 403 });
    }
    let debts = [];
    if (groupData.simplifyDebts) {
        const netBalances = await getNetBalances(groupId);
        const debter = netBalances.filter((netBalance) => netBalance.net_balance < 0).sort((a, b) => Math.abs(b.net_balance - a.net_balance));
        const creditor = netBalances.filter((netBalance) => netBalance.net_balance > 0).sort((a, b) => b.net_balance - a.net_balance);

        let x = 0;
        let y = 0;
        let tempDebts = [];

        while (x < debter.length && y < creditor.length) {
            const debterUser = debter[x];
            const creditorUser = creditor[y];
            const amount = Math.min(Math.abs(debterUser.net_balance), creditorUser.net_balance);
            tempDebts.push({
                debterId: debterUser.user_id,
                creditorId: creditorUser.user_id,
                debterImage: debterUser.image,
                creditorImage: creditorUser.image,
                debterName: debterUser.name,
                creditorName: creditorUser.name,
                amount,
            });
            debterUser.net_balance += amount;
            creditorUser.net_balance -= amount;
            if (debterUser.net_balance === 0) {
                x++;
            }
            if (creditorUser.net_balance === 0) {
                y++;
            }
        }

        debts = tempDebts
            .filter((deb) => deb.amount > 0 && (deb.debterId === session.user.id || deb.creditorId === session.user.id))
            .map((deb) => {
                const isMyDebt = deb.debterId === session.user.id;

                return {
                    other_user_id: isMyDebt ? deb.creditorId : deb.debterId,
                    amount: isMyDebt ? -deb.amount : deb.amount,
                    image: isMyDebt ? deb.creditorImage : deb.debterImage,
                    name: isMyDebt ? deb.creditorName : deb.debterName,
                };
            });
    }
    else {
        debts = await getUserDebts(session.user.id, groupId);
    }

    return Response.json({ debts });
}