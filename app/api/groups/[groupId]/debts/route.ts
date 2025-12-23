import { db, group } from "@/db/schema";
import { isGroupMember } from "@/lib/helpers/checks";
import { getNetBalances, getUserDebts } from "@/lib/helpers/queries";
import { auth } from "@/utils/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const groupIdInt = parseInt(groupId);

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupData = await db.query.group.findFirst({
    where: eq(group.id, groupIdInt),
  });

  if (!groupData) {
    return Response.json({ error: "Group not found" }, { status: 404 });
  }

  if (!(await isGroupMember(session.user.id, groupIdInt))) {
    return Response.json(
      {
        error: "You are not a member of this group. You can't remove members.",
      },
      { status: 403 }
    );
  }

  let debts = [];

  if (groupData.simplifyDebts) {
    const netBalances = await getNetBalances(groupIdInt);

    const debtors = netBalances
      .filter((nb) => nb.net_balance < -0.01)
      .sort((a, b) => a.net_balance - b.net_balance);

    const creditors = netBalances
      .filter((nb) => nb.net_balance > 0.01)
      .sort((a, b) => b.net_balance - a.net_balance);

    let x = 0;
    let y = 0;
    let tempDebts = [];

    while (x < debtors.length && y < creditors.length) {
      const debtor = debtors[x];
      const creditor = creditors[y];

      let amount = Math.min(Math.abs(debtor.net_balance), creditor.net_balance);

      amount = Math.round(amount * 100) / 100;

      if (amount > 0) {
        tempDebts.push({
          debterId: debtor.user_id,
          creditorId: creditor.user_id,
          debterImage: debtor.user_image,
          creditorImage: creditor.user_image,
          debterName: debtor.user_name,
          creditorName: creditor.user_name,
          amount,
        });
      }

      debtor.net_balance += amount;
      creditor.net_balance -= amount;

      if (Math.abs(debtor.net_balance) < 0.01) {
        x++;
      }
      if (Math.abs(creditor.net_balance) < 0.01) {
        y++;
      }
    }

    debts = tempDebts
      .filter(
        (deb) =>
          deb.amount > 0.01 &&
          (deb.debterId === session.user.id ||
            deb.creditorId === session.user.id)
      )
      .map((deb) => {
        const isITheDebtor = deb.debterId === session.user.id;

        return {
          other_user_id: isITheDebtor ? deb.creditorId : deb.debterId,
          other_user_name: isITheDebtor ? deb.creditorName : deb.debterName,
          other_user_image: isITheDebtor ? deb.creditorImage : deb.debterImage,

          amount: isITheDebtor ? -deb.amount : deb.amount,

          type: isITheDebtor ? "PAYABLE" : "RECEIVABLE",
        };
      });

  } else {
    debts = await getUserDebts(session.user.id, groupIdInt);
  }

  return Response.json({ debts });
}
